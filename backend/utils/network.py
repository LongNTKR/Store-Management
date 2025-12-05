"""
Network connectivity checker utility.
Checks internet connectivity before making external API calls.
"""
import socket
from typing import Dict


def check_internet_connectivity() -> Dict[str, any]:
    """
    Check if the system has internet connectivity.

    Tests connection to reliable public DNS servers:
    - Google DNS (8.8.8.8)
    - Cloudflare DNS (1.1.1.1)

    Returns:
        Dict with keys:
        - connected (bool): True if internet is available
        - message (str): Status message
    """
    hosts_to_check = [
        ("8.8.8.8", 53, "Google DNS"),  # Google DNS
        ("1.1.1.1", 53, "Cloudflare DNS"),  # Cloudflare DNS
    ]

    for host, port, name in hosts_to_check:
        try:
            # Set a short timeout (3 seconds)
            socket.setdefaulttimeout(3)
            # Try to connect to the host
            socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
            return {
                "connected": True,
                "message": f"Kết nối internet thành công (via {name})"
            }
        except socket.error:
            continue

    # If all hosts failed
    return {
        "connected": False,
        "message": "Không có kết nối internet. Vui lòng kiểm tra kết nối mạng của bạn."
    }


def check_api_endpoint(url: str, timeout: int = 5) -> Dict[str, any]:
    """
    Check if a specific API endpoint is reachable.

    Args:
        url: URL to check (e.g., "https://api.openai.com")
        timeout: Timeout in seconds

    Returns:
        Dict with connected (bool) and message (str)
    """
    import urllib.request

    try:
        urllib.request.urlopen(url, timeout=timeout)
        return {
            "connected": True,
            "message": f"API endpoint {url} is reachable"
        }
    except Exception as e:
        return {
            "connected": False,
            "message": f"Cannot reach {url}: {str(e)}"
        }
