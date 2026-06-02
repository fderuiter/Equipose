import subprocess
import json
import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:4200/generator?mode=simulation")
    # Wait for the results grid to appear
    page.wait_for_selector("text=Generated Schema", timeout=10000)

    # We are in simulation mode, but the wizard is still on step 0. 
    # Click Next until we reach the end
    for _ in range(6):
        try:
            page.get_by_role("button", name="Next").click(timeout=1000)
            page.wait_for_timeout(200)
        except:
            break

    # Click the "Generate Code" dropdown
    page.get_by_role("button", name="Generate Code").click()
    page.wait_for_timeout(500)
    
    # Click Python Script
    page.get_by_role("menuitem", name="Python Script").click()
    page.wait_for_selector("text=Code Generator", timeout=5000)

    # Download Python file
    with page.expect_download() as download_info:
        page.locator("button:has-text('Download')").first.click()
    
    download = download_info.value
    download.save_as("shadow.py")
    
    print("Downloaded shadow.py, executing shadow script for logic verification...")
    result = subprocess.run(["python3", "shadow.py"], capture_output=True, text=True)
    if result.returncode != 0:
        print("Shadow script failed!")
        print(result.stderr)
        assert False, "Shadow execution failed"
    
    print("Shadow script execution successful.")
    
    # Assert functional properties in the output
    assert "SubjectID" in result.stdout
    assert "Treatment" in result.stdout

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
