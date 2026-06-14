# Managed Gateway

The commercial hosted-token mode must not ship the provider master API token in
the client.

## Client Config

```json
{
  "mode": "managed_gateway",
  "api_base": "https://api.your-domain.com/evoscientist/v1",
  "site_url": "https://your-domain.com",
  "product": "evoscientist-studio",
  "channel": "stable",
  "default_model": "deepseek-v4-flash",
  "allow_user_byok": false
}
```

## Server Responsibilities

- User login or activation.
- License validation.
- Model proxy.
- Usage accounting.
- Quota and plan status.
- Rate limiting.
- Abuse detection.
- Audit logs.
- Revocation.

## UI Display

Managed mode displays the user's product quota, not the provider master account
balance.

