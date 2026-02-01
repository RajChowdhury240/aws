#!/usr/bin/env python3
"""
AWS IAM Data Fetcher
Downloads all AWS service IAM reference data from the AWS Service Reference API
and consolidates it into a single JSON file for the webapp.
"""

import json
import requests
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import time

BASE_URL = "https://servicereference.us-east-1.amazonaws.com"
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
        # If none of the above, it's a Read action
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
    total_resources = sum(len(s["resources"]) for s in all_data)
    total_condition_keys = sum(len(s["conditionKeys"]) for s in all_data)

    print(f"\nStatistics:")
    print(f"  - Total actions: {total_actions}")
    print(f"  - Total resource types: {total_resources}")
    print(f"  - Total condition keys: {total_condition_keys}")


if __name__ == "__main__":
    main()
