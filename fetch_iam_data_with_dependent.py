#!/usr/bin/env python3
"""
AWS IAM Data Fetcher with Dependent Actions
Downloads all AWS service IAM reference data and scrapes HTML for dependent actions.
"""

import json
import requests
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from bs4 import BeautifulSoup
import urllib.parse

BASE_URL = "https://servicereference.us-east-1.amazonaws.com"
DOCS_BASE_URL = "https://docs.aws.amazon.com/service-authorization/latest/reference"
OUTPUT_DIR = Path("data")
OUTPUT_FILE = OUTPUT_DIR / "aws-iam-consolidated.json"


def fetch_service_list():
    """Fetch the list of all AWS services."""
    print("Fetching service list...")
    response = requests.get(BASE_URL, timeout=30)
    response.raise_for_status()
    return response.json()


def fetch_service_data(service_info):
    """Fetch IAM data for a specific service."""
    service_name = service_info["service"]
    url = service_info["url"]

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Process the data to extract key information
        processed = {
            "service": service_name,
            "name": data.get("Name", service_name),
            "actions": [],
            "resources": [],
            "conditionKeys": [],
        }

        # Process actions
        for action in data.get("Actions", []):
            action_data = {
                "name": action.get("Name"),
                "accessLevel": get_access_level(action),
                "conditionKeys": action.get("ActionConditionKeys", []),
                "resources": [r.get("Name") for r in action.get("Resources", [])],
                "supportsResourceLevelPermissions": len(action.get("Resources", []))
                > 0,
                "properties": action.get("Annotations", {}).get("Properties", {}),
                "dependentActions": [],  # Will be populated later
            }

            # Check for tag-related condition keys
            action_data["hasRequestTag"] = any(
                "RequestTag" in key for key in action_data["conditionKeys"]
            )
            action_data["hasResourceTag"] = any(
                "ResourceTag" in key for key in action_data["conditionKeys"]
            )
            action_data["hasTagKeys"] = any(
                "TagKeys" in key for key in action_data["conditionKeys"]
            )

            processed["actions"].append(action_data)

        # Process resources
        for resource in data.get("Resources", []):
            processed["resources"].append(
                {
                    "name": resource.get("Name"),
                    "arnFormats": resource.get("ARNFormats", []),
                }
            )

        # Process condition keys
        for ck in data.get("ConditionKeys", []):
            processed["conditionKeys"].append(
                {"name": ck.get("Name"), "types": ck.get("Types", [])}
            )

        return processed

    except Exception as e:
        print(f"Error fetching {service_name}: {e}")
        return None


def scrape_dependent_actions(service_name):
    """Scrape dependent actions from HTML documentation."""
    try:
        # Construct the documentation URL
        # Service names need to be converted to the doc page format
        doc_service_name = service_name.replace("-", "").replace("_", "")

        # Try multiple URL patterns
        urls_to_try = [
            f"{DOCS_BASE_URL}/list_{doc_service_name}.html",
            f"{DOCS_BASE_URL}/list_aws{doc_service_name}.html",
            f"{DOCS_BASE_URL}/list_amazon{doc_service_name}.html",
        ]

        response = None
        for doc_url in urls_to_try:
            response = requests.get(doc_url, timeout=30)
            if response.status_code == 200:
                break

        if response.status_code != 200:
            return {}

        soup = BeautifulSoup(response.text, "html.parser")

        # Find the actions table
        # Dependent actions are typically in the last column of each action row
        dependent_actions_map = {}

        # Look for tables with action data
        tables = soup.find_all("table")

        for table in tables:
            # Check if this is the actions table by looking for header
            headers = table.find_all("th")
            header_texts = [h.get_text().strip() for h in headers]

            # Look for "Dependent actions" in headers
            has_dependent_column = any("ependent" in h.lower() for h in header_texts)

            if has_dependent_column or (
                "Actions" in header_texts and "Access level" in header_texts
            ):
                rows = table.find_all("tr")[1:]  # Skip header row

                for row in rows:
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 5:
                        # Action name is usually in the first cell
                        action_name = cells[0].get_text().strip()

                        # Dependent actions are usually in the last cell
                        dependent_cell = cells[-1]
                        cell_text = dependent_cell.get_text().strip()

                        # Look for service:Action patterns in text
                        dependent_actions = []
                        # Pattern matches service:ActionName or service:action-name
                        pattern = r"([a-z0-9-]+):([A-Z][a-zA-Z0-9]+)"
                        matches = re.findall(pattern, cell_text)
                        for service_part, action_part in matches:
                            dependent_actions.append(f"{service_part}:{action_part}")

                        # Also check for links if present
                        dependent_links = dependent_cell.find_all("a")
                        for link in dependent_links:
                            dep_action = link.get_text().strip()
                            if (
                                dep_action
                                and ":" in dep_action
                                and dep_action not in dependent_actions
                            ):
                                dependent_actions.append(dep_action)

                        if dependent_actions:
                            dependent_actions_map[action_name] = dependent_actions

        return dependent_actions_map

    except Exception as e:
        print(f"Error scraping dependent actions for {service_name}: {e}")
        return {}


def get_access_level(action):
    """Determine access level from action properties."""
    props = action.get("Annotations", {}).get("Properties", {})

    if props.get("IsList"):
        return "List"
    elif props.get("IsWrite"):
        return "Write"
    elif props.get("IsPermissionManagement"):
        return "Permissions management"
    elif props.get("IsTaggingOnly"):
        return "Tagging"
    else:
        return "Read"


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Fetch service list
    services = fetch_service_list()
    print(f"Found {len(services)} services")

    # Fetch data for all services
    all_data = []
    failed = []

    print("Fetching service data...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(fetch_service_data, service): service
            for service in services
        }

        for i, future in enumerate(as_completed(futures)):
            service = futures[future]
            result = future.result()

            if result:
                all_data.append(result)
                print(f"✓ {service['service']} ({i + 1}/{len(services)})")
            else:
                failed.append(service["service"])
                print(f"✗ {service['service']} ({i + 1}/{len(services)}) - FAILED")

    # Scrape dependent actions for each service
    print("\nScraping dependent actions from documentation...")
    for i, service_data in enumerate(all_data):
        service_name = service_data["service"]
        try:
            dependent_map = scrape_dependent_actions(service_name)

            # Update actions with dependent actions
            for action in service_data["actions"]:
                action_name = action["name"]
                if action_name in dependent_map:
                    action["dependentActions"] = dependent_map[action_name]

            if dependent_map:
                print(
                    f"✓ {service_name}: Found {sum(len(v) for v in dependent_map.values())} dependent actions in {len(dependent_map)} actions"
                )
            else:
                print(
                    f"○ {service_name}: No dependent actions found ({i + 1}/{len(all_data)})"
                )

        except Exception as e:
            print(f"✗ {service_name}: Error scraping - {e}")

        # Small delay to be respectful to the server
        time.sleep(0.1)

    # Sort by service name
    all_data.sort(key=lambda x: x["service"])

    # Save consolidated data
    print(f"\nSaving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        json.dump(
            {
                "services": all_data,
                "totalServices": len(all_data),
                "failedServices": failed,
                "lastUpdated": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            f,
            indent=2,
        )

    print(f"\n✓ Successfully fetched {len(all_data)} services")
    if failed:
        print(f"✗ Failed to fetch {len(failed)} services: {', '.join(failed)}")

    # Print statistics
    total_actions = sum(len(s["actions"]) for s in all_data)
    total_with_dependent = sum(
        1 for s in all_data for a in s["actions"] if a["dependentActions"]
    )

    print(f"\nStatistics:")
    print(f"  - Total actions: {total_actions}")
    print(f"  - Actions with dependent actions: {total_with_dependent}")


if __name__ == "__main__":
    main()
