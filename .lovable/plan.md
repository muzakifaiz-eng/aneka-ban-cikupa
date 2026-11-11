# Customer Notifications

## What will be built
- Add persistent, per-customer notifications for promotions and service updates, with unread state and links to relevant pages.
- Add a bell menu in the site header and a full customer notifications page, plus a customer-controlled promotions preference.
- Add an admin promotion composer with title, body, optional banner/action link, recipient selection (all opted-in customers or one customer), send action, and delivered/read counts.
- Automatically create customer notices when order, payment, or refund statuses change. There is no existing messaging or scheduling system, so admin replies and automatic future-time delivery are not included.

## Data and security
- Confirmed there is no existing notification, message, or inquiry table; create one notifications table and one notification-preferences table, with explicit grants and RLS.
- Customers can read only their own notices and update only their own read marker/preferences. Only admins can send promotions; database triggers create service notices.
- Use a dedicated promotion-image storage bucket; do not change authentication, roles, existing payment/order tables, or existing storage buckets.

## Implementation
- Add a shared notification data hook/menu and a customer notifications page; add a promotion preference control to the existing customer account page.
- Add an admin notification page and sidebar link, including recipient lookup, image upload, immediate sending, and per-campaign delivery/read metrics.
- Add database triggers for order, payment, and refund status events, then verify migrations, build logs, and the customer/admin flows available in preview.
