import requests


def authenticated_get(url: str, auth_header: str):

    return requests.get(
        url,
        headers={"Authorization": auth_header},
        timeout=5
    )


def authenticated_post(url: str, auth_header: str, json=None):

    return requests.post(
        url,
        headers={"Authorization": auth_header},
        json=json,
        timeout=5
    )