#!/usr/bin/env python3
"""
AWS IAM Data Fetcher - Full HTML Scraping
Scrapes all data from AWS documentation including descriptions and dependent actions.
"""

import json
import requests
import re
import time
from pathlib import Path
from bs4 import BeautifulSoup

DOCS_BASE_URL = "https://docs.aws.amazon.com/service-authorization/latest/reference"
OUTPUT_DIR = Path("data")
OUTPUT_FILE = OUTPUT_DIR / "aws-iam-consolidated.json"

# Service name mappings for documentation URLs
SERVICE_URL_PATTERNS = [
    "list_amazon{service}.html",
    "list_aws{service}.html",
    "list_{service}.html",
]

# Special cases for services with non-standard URL patterns
SERVICE_SPECIAL_CASES = {
    "iam": "list_awsidentityandaccessmanagementiam.html",
    "identityandaccessmanagement": "list_awsidentityandaccessmanagementiam.html",
    "glue": "list_awsglue.html",
}


def normalize_service_name(service_name):
    """Convert service name to doc URL format."""
    return service_name.replace("-", "").replace("_", "").lower()


def get_service_doc_url(service_name):
    """Try multiple URL patterns to find the documentation page."""
    normalized = normalize_service_name(service_name)

    # Check special cases first
    if normalized in SERVICE_SPECIAL_CASES:
        url = f"{DOCS_BASE_URL}/{SERVICE_SPECIAL_CASES[normalized]}"
        try:
            response = requests.head(url, timeout=10, allow_redirects=True)
            if response.status_code == 200:
                return url
        except:
            pass

    for pattern in SERVICE_URL_PATTERNS:
        url = f"{DOCS_BASE_URL}/{pattern.format(service=normalized)}"
        try:
            response = requests.head(url, timeout=10, allow_redirects=True)
            if response.status_code == 200:
                return url
        except:
            continue

    return None


def scrape_service_data(service_name):
    """Scrape all action data from HTML documentation."""
    url = get_service_doc_url(service_name)
    if not url:
        print(f"  ✗ No doc page found for {service_name}")
        return None

    try:
        response = requests.get(url, timeout=30)
        soup = BeautifulSoup(response.text, "html.parser")

        # Find the service display name
        title_elem = soup.find("h1", class_="topictitle")
        service_display_name = service_name
        if title_elem:
            title_text = title_elem.get_text()
            match = re.search(r"for\s+(.+?)(?:\s+-|$)", title_text)
            if match:
                service_display_name = match.group(1).strip()

        # Find the actions table
        actions = []
        resources = []
        condition_keys = []

        tables = soup.find_all("table")

        for table in tables:
            headers = [th.get_text().strip() for th in table.find_all("th")]

            # Check if this is the actions table
            if "Actions" in headers and "Access level" in headers:
                rows = table.find_all("tr")[1:]  # Skip header

                for row in rows:
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 4:
                        # Extract data from each column
                        action_data = {
                            "name": cells[0].get_text().strip(),
                            "description": cells[1].get_text().strip()
                            if len(cells) > 1
                            else "",
                            "accessLevel": cells[2].get_text().strip()
                            if len(cells) > 2
                            else "Unknown",
                            "resources": [],
                            "conditionKeys": [],
                            "dependentActions": [],
                            "supportsResourceLevelPermissions": False,
                        }

                        # Extract resources from column 3
                        if len(cells) > 3:
                            resource_cell = cells[3]
                            resource_links = resource_cell.find_all("a")
                            for link in resource_links:
                                resource_name = link.get_text().strip()
                                if resource_name:
                                    action_data["resources"].append(resource_name)
                                    if "*" in resource_name:
                                        action_data[
                                            "supportsResourceLevelPermissions"
                                        ] = True

                        # Extract condition keys from column 4
                        if len(cells) > 4:
                            condition_cell = cells[4]
                            condition_links = condition_cell.find_all("a")
                            for link in condition_links:
                                condition_key = link.get_text().strip()
                                if condition_key and ":" in condition_key:
                                    action_data["conditionKeys"].append(condition_key)

                        # Extract dependent actions from last column
                        if len(cells) > 5:
                            dependent_cell = cells[-1]
                            cell_text = dependent_cell.get_text().strip()

                            # Pattern matches service:ActionName
                            pattern = r"([a-z0-9-]+):([A-Z][a-zA-Z0-9]+)"
                            matches = re.findall(pattern, cell_text)
                            action_data["dependentActions"] = [
                                f"{svc}:{act}" for svc, act in matches
                            ]

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

                        # Determine properties based on access level
                        access = action_data["accessLevel"].lower()
                        action_data["properties"] = {
                            "IsList": "list" in access,
                            "IsRead": "read" in access and "write" not in access,
                            "IsWrite": "write" in access,
                            "IsPermissionManagement": "permission" in access
                            or "management" in access,
                            "IsTaggingOnly": "tagging" in access,
                        }

                        actions.append(action_data)

            # Check if this is the resources table
            elif "Resource types" in headers and "ARN" in headers:
                rows = table.find_all("tr")[1:]
                for row in rows:
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 2:
                        resource_name = cells[0].get_text().strip()
                        arn = cells[1].get_text().strip()
                        if resource_name:
                            resources.append(
                                {
                                    "name": resource_name,
                                    "arnFormats": [arn] if arn else [],
                                }
                            )

            # Check if this is condition keys table
            elif "Condition keys" in headers and "Type" in headers:
                rows = table.find_all("tr")[1:]
                for row in rows:
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 2:
                        key_name = cells[0].get_text().strip()
                        key_type = cells[1].get_text().strip()
                        if key_name:
                            condition_keys.append(
                                {
                                    "name": key_name,
                                    "types": [key_type] if key_type else ["String"],
                                }
                            )

        return {
            "service": service_name,
            "name": service_display_name,
            "actions": actions,
            "resources": resources,
            "conditionKeys": condition_keys,
        }

    except Exception as e:
        print(f"  ✗ Error scraping {service_name}: {e}")
        return None


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Get list of services from the JSON API
    print("Fetching service list...")
    try:
        response = requests.get(
            "https://servicereference.us-east-1.amazonaws.com", timeout=30
        )
        services = response.json()
        print(f"Found {len(services)} services")
    except Exception as e:
        print(f"Error fetching service list: {e}")
        return

    # Scrape each service
    all_data = []
    failed = []

    print("\nScraping all services from documentation...")
    print("This will take approximately 5-10 minutes...\n")

    for i, service_info in enumerate(services):
        service_name = service_info["service"]
        print(f"[{i + 1}/{len(services)}] Scraping {service_name}...", end=" ")

        result = scrape_service_data(service_name)
        if result:
            all_data.append(result)
            total_deps = sum(len(a["dependentActions"]) for a in result["actions"])
            print(
                f"✓ ({len(result['actions'])} actions, {total_deps} dependent actions)"
            )
        else:
            failed.append(service_name)
            print(f"✗ FAILED")

        # Be respectful to the server
        time.sleep(0.2)

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

    print(f"\n✓ Successfully scraped {len(all_data)} services")
    if failed:
        print(f"✗ Failed to scrape {len(failed)} services: {', '.join(failed)}")

    # Print statistics
    total_actions = sum(len(s["actions"]) for s in all_data)
    total_with_description = sum(
        1 for s in all_data for a in s["actions"] if a.get("description")
    )
    total_with_dependent = sum(
        len(a["dependentActions"]) for s in all_data for a in s["actions"]
    )

    print(f"\nStatistics:")
    print(f"  - Total actions: {total_actions}")
    print(f"  - Actions with descriptions: {total_with_description}")
    print(f"  - Total dependent action relationships: {total_with_dependent}")


if __name__ == "__main__":
    main()
