# SMTP Configuration for Email Notifications

Add these environment variables to your `.env` file to enable email notifications:

## Required SMTP Variables

```env
# SMTP Server Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# SMTP Authentication
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email From Address (optional, defaults to SMTP_USER)
SMTP_FROM=your-email@gmail.com
```

## Example Configurations for Popular Email Providers

### Gmail (Recommended)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
```

**Note for Gmail:** You need to use an App Password, not your regular password. To get an App Password:
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account settings → Security → App passwords
3. Generate a new app password for "Mail"

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@yahoo.com
```

### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@yourdomain.com
```

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords when available (Gmail, Yahoo)
- Consider using environment-specific SMTP settings for development vs production
- Test your SMTP configuration before deploying to production

## Testing the Configuration

After setting up your SMTP configuration:

1. Go to `/dashboard/emailing-lists` and add admin email addresses
2. Create or update a customer profile
3. Check the server logs for email sending confirmation
4. Verify that admin emails receive the notification 