import requests

def authenticated_get(url, token):

    return requests.get(
        url,
        headers={"Authorization": token},
        timeout=5
    )