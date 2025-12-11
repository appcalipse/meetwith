# Billing Feature - UI & Email Design Requirements

This document outlines all UI components and email templates needed for the billing feature. Share this with your UX/UI designer.

---

## 🎨 UI Components Required

### 1. Billing Dashboard Page

**Location**: `/dashboard/billing` or `/dashboard/account/billing`

**Sections Needed:**

#### 1.1 Current Subscription Status Card

- **Active Subscription State:**

  - Plan name (Monthly Pro / Yearly Pro)
  - Plan price ($8/month or $80/year)
  - Status badge (Active / Cancelled / Expired)
  - Next billing date (for Stripe subscriptions)
  - Expiry date (for all subscriptions)
  - Payment method indicator (Stripe / Crypto)
  - "Cancel Subscription" button (if active Stripe subscription)
  - "Resume Subscription" button (if cancelled but not expired)

- **No Subscription State:**
  - "You're on the Free Plan" message
  - Free tier limitations list
  - "Upgrade to Pro" CTA button

#### 1.2 Subscription History Section

- Table/list of all subscription periods
- Columns: Period, Plan, Amount, Status, Date Range, Transaction
- Expandable rows for transaction details
- Empty state: "No subscription history"

#### 1.3 Plan Comparison Section (Optional)

- Side-by-side comparison of Free vs Pro features
- Highlight current plan
- "Upgrade" or "Change Plan" buttons

---

### 2. Subscription Selection/Checkout Page

**Location**: `/billing/subscribe` or `/dashboard/billing/subscribe`

**Components Needed:**

#### 2.1 Plan Selection Cards

- **Monthly Plan Card:**

  - Plan name: "Monthly Pro"
  - Price: "$8/month"
  - Billing cycle: "Billed monthly"
  - "Select" or "Choose Plan" button
  - Recommended badge (optional)

- **Yearly Plan Card:**
  - Plan name: "Yearly Pro"
  - Price: "$80/year"
  - Savings indicator: "Save $16/year" or "Save 17%"
  - Billing cycle: "Billed annually"
  - "Select" or "Choose Plan" button
  - Popular/Best Value badge (optional)

#### 2.2 Payment Method Selection

- Radio buttons or tabs:
  - "Credit/Debit Card" (Stripe)
  - "Crypto Payment" (Thirdweb)
- Icons/logos for payment methods

#### 2.3 Payment Summary

- Plan selected
- Billing cycle
- Subtotal
- Tax (if applicable - Stripe handles this)
- Total amount
- "Subscribe" or "Continue to Payment" button

#### 2.4 Terms & Conditions

- Checkbox: "I agree to the Terms of Service and Privacy Policy"
- Links to terms and privacy policy

---

### 3. Payment Success Page

**Location**: `/billing/success` or `/billing/success?session_id=xxx`

**Content Needed:**

- Success icon/illustration
- Heading: "Welcome to Pro!"
- Confirmation message
- Subscription details:
  - Plan name
  - Amount charged
  - Next billing date
  - Transaction ID/reference
- "Go to Dashboard" button
- "View Subscription Details" link

---

### 4. Payment Cancel Page

**Location**: `/billing/cancel` or `/billing/cancel?session_id=xxx`

**Content Needed:**

- Cancel icon/illustration
- Heading: "Payment Cancelled"
- Message explaining cancellation
- "Try Again" button
- "Back to Billing" link

---

### 5. Subscription Cancellation Dialog/Modal

**Trigger**: "Cancel Subscription" button click

**Content Needed:**

- Warning icon
- Heading: "Cancel Subscription?"
- Confirmation message:
  - Explain what happens when cancelled
  - Access continues until period end
  - Date when access will end
- "Keep Subscription" button (secondary)
- "Cancel Subscription" button (primary, destructive)
- Checkbox: "I understand I will lose access on [date]"

---

### 6. Feature Limit Messages/Modals

**Trigger**: When free users try to exceed limits

**Messages Needed for Each Feature:**

#### 6.1 Meeting Type Limit

- Title: "Meeting Type Limit Reached"
- Message: "Free tier allows only 1 meeting type. Upgrade to Pro for unlimited meeting types."
- "Upgrade to Pro" button
- "Cancel" button

#### 6.2 Scheduling Groups Limit

- Title: "Scheduling Groups Limit Reached"
- Message: "Free tier allows only 5 scheduling groups. Upgrade to Pro for unlimited groups."
- "Upgrade to Pro" button
- "Cancel" button

#### 6.3 Calendar Integration Limit

- Title: "Calendar Integration Limit Reached"
- Message: "Free tier allows only 1 calendar integration. Upgrade to Pro for unlimited integrations."
- "Upgrade to Pro" button
- "Cancel" button

#### 6.4 QuickPoll Limit

- Title: "QuickPoll Limit Reached"
- Message: "Free tier allows only 2 active polls at a time. Upgrade to Pro for unlimited polls."
- "Upgrade to Pro" button
- "Cancel" button

#### 6.5 Calendar Sync Limit

- Title: "Calendar Sync Limit Reached"
- Message: "Free tier allows only 1 calendar sync. Upgrade to Pro for unlimited calendar syncs."
- "Upgrade to Pro" button
- "Cancel" button

---

### 7. Navigation Updates

#### 7.1 Dashboard Navigation

- Add "Billing" or "Subscription" link to main navigation
- Icon: Credit card or subscription icon

#### 7.2 Account Settings Page

- Update "Account Plans & Billing" section:
  - Show current subscription status
  - Link to billing page
  - Show plan details

#### 7.3 Landing Page

- Update "Go Pro" button to link to `/billing/subscribe`
- Ensure CTA is prominent

---

### 8. Status Badges/Indicators

**Design needed for:**

- Active subscription badge (green)
- Cancelled subscription badge (yellow/orange)
- Expired subscription badge (red/gray)
- Free tier badge (gray)

---

### 9. Loading States

**Design needed for:**

- Loading spinner for subscription data
- Skeleton loaders for billing page
- Loading state for "Subscribe" button

---

### 10. Error States

**Design needed for:**

- Error message when subscription creation fails
- Error message when payment fails
- Error message when cancellation fails
- Retry buttons

---

## 📧 Email Templates Required

**Note**: Based on existing email structure, templates should be in `src/emails/` directory using Pug templates.

### 1. Subscription Confirmation Email

**Template**: `src/emails/subscription_confirmation/`

**Trigger**: When subscription is successfully created (via webhook)

**Content Needed:**

- Subject: "Welcome to Meetwith Pro! 🎉"
- Heading: "Your Pro subscription is active"
- Body:
  - Thank you message
  - Plan details (Monthly/Yearly, $8/$80)
  - Subscription start date
  - Next billing date
  - Amount charged
  - Transaction reference
- CTA: "Manage Subscription" (links to billing page)
- Footer: Support contact, unsubscribe link

**Variables Needed:**

- `userName`
- `planName` (Monthly Pro / Yearly Pro)
- `planPrice` ($8 or $80)
- `billingCycle` (monthly/yearly)
- `startDate`
- `nextBillingDate`
- `amountCharged`
- `transactionId`
- `billingPageUrl`

---

### 2. Payment Success Email (Renewal)

**Template**: `src/emails/subscription_renewal/`

**Trigger**: When subscription renews (invoice.payment_succeeded webhook)

**Content Needed:**

- Subject: "Your Pro subscription has been renewed"
- Heading: "Payment successful"
- Body:
  - Confirmation of payment
  - Amount charged
  - Next billing date
  - Transaction reference
- CTA: "View Subscription" (links to billing page)
- Footer: Support contact

**Variables Needed:**

- `userName`
- `planName`
- `amountCharged`
- `nextBillingDate`
- `transactionId`
- `billingPageUrl`

---

### 3. Payment Failed Email

**Template**: `src/emails/subscription_payment_failed/`

**Trigger**: When payment fails (invoice.payment_failed webhook)

**Content Needed:**

- Subject: "Action Required: Payment Failed"
- Heading: "We couldn't process your payment"
- Body:
  - Explanation of payment failure
  - Current subscription status
  - Grace period information (if applicable)
  - Steps to resolve:
    1. Update payment method
    2. Check card details
    3. Contact support if issue persists
- CTA: "Update Payment Method" (links to billing page)
- Secondary CTA: "Contact Support"
- Footer: Support contact

**Variables Needed:**

- `userName`
- `planName`
- `failureReason` (optional)
- `gracePeriodEndDate` (if applicable)
- `billingPageUrl`
- `supportUrl`

---

### 4. Subscription Cancelled Email

**Template**: `src/emails/subscription_cancelled/`

**Trigger**: When user cancels subscription

**Content Needed:**

- Subject: "Your Pro subscription has been cancelled"
- Heading: "Subscription cancelled"
- Body:
  - Confirmation of cancellation
  - Access end date (when subscription expires)
  - What happens after expiry:
    - Features that will be limited
    - Data retention policy
  - Option to resubscribe
- CTA: "Resume Subscription" (links to billing page)
- Secondary CTA: "View Free Features"
- Footer: Support contact

**Variables Needed:**

- `userName`
- `planName`
- `accessEndDate`
- `billingPageUrl`

---

### 5. Subscription Expired Email

**Template**: `src/emails/subscription_expired/`

**Trigger**: When subscription expires

**Content Needed:**

- Subject: "Your Pro subscription has expired"
- Heading: "Your Pro access has ended"
- Body:
  - Notification of expiry
  - What changed:
    - Features now limited
    - What you can still do
  - Subscription history summary
  - Option to resubscribe
- CTA: "Resubscribe to Pro" (links to billing page)
- Secondary CTA: "View Free Features"
- Footer: Support contact

**Variables Needed:**

- `userName`
- `planName`
- `expiryDate`
- `billingPageUrl`

---

### 6. Subscription Expiry Reminder Emails

**Template**: `src/emails/subscription_expiry_reminder/`

**Trigger**: 7 days, 3 days, and 1 day before expiry

**Content Needed:**

- Subject: "Your Pro subscription expires in [X] days"
- Heading: "Your Pro subscription is expiring soon"
- Body:
  - Days remaining
  - Expiry date
  - What happens after expiry
  - Benefits of staying on Pro
- CTA: "Renew Subscription" (links to billing page)
- Footer: Support contact

**Variables Needed:**

- `userName`
- `planName`
- `daysRemaining` (7, 3, or 1)
- `expiryDate`
- `billingPageUrl`

**Note**: For crypto subscriptions, this serves as a renewal reminder since they require manual renewal.

---

### 7. Crypto Subscription Renewal Reminder

**Template**: `src/emails/crypto_subscription_renewal_reminder/`

**Trigger**: 7 days, 3 days, and 1 day before crypto subscription expiry

**Content Needed:**

- Subject: "Renew your Pro subscription - [X] days remaining"
- Heading: "Time to renew your Pro subscription"
- Body:
  - Days remaining
  - Expiry date
  - Instructions for manual renewal
  - Link to renewal page
- CTA: "Renew Now" (links to renewal page)
- Footer: Support contact

**Variables Needed:**

- `userName`
- `planName`
- `daysRemaining`
- `expiryDate`
- `renewalPageUrl`

---

## 🎨 Design Specifications

### Color Scheme

- **Success/Active**: Green (#10B981 or similar)
- **Warning/Cancelled**: Yellow/Orange (#F59E0B or similar)
- **Error/Expired**: Red (#EF4444 or similar)
- **Primary CTA**: Brand primary color
- **Secondary CTA**: Gray or outlined

### Typography

- Follow existing design system
- Headings: Bold, clear hierarchy
- Body text: Readable, appropriate line height

### Icons Needed

- Credit card icon
- Subscription icon
- Checkmark (success)
- X/Close (cancel/error)
- Calendar icon (for dates)
- Dollar/Crypto icons (for payment methods)
- Warning icon
- Info icon

### Responsive Design

- Mobile-first approach
- Ensure all components work on:
  - Mobile (320px+)
  - Tablet (768px+)
  - Desktop (1024px+)

---

## 📋 Copy Requirements

### Button Labels

- "Subscribe to Pro"
- "Upgrade to Pro"
- "Cancel Subscription"
- "Resume Subscription"
- "Change Plan"
- "Update Payment Method"
- "View Subscription Details"
- "Go to Dashboard"
- "Try Again"
- "Contact Support"

### Status Messages

- "Active" (subscription is active)
- "Cancelled" (subscription cancelled, access until period end)
- "Expired" (subscription expired, no access)
- "Pending" (payment processing)

### Error Messages

- "Payment failed. Please update your payment method."
- "Unable to create subscription. Please try again."
- "Subscription not found."
- "An error occurred. Please contact support."

### Success Messages

- "Subscription activated successfully!"
- "Payment processed successfully."
- "Subscription cancelled. Access continues until [date]."

---

## 🔄 User Flows to Design

### Flow 1: New Subscription

1. User clicks "Go Pro" or "Upgrade"
2. Lands on subscription selection page
3. Selects plan (Monthly/Yearly)
4. Selects payment method
5. Redirects to Stripe Checkout (or crypto payment)
6. Returns to success page
7. Receives confirmation email

### Flow 2: Cancel Subscription

1. User on billing page
2. Clicks "Cancel Subscription"
3. Sees cancellation confirmation dialog
4. Confirms cancellation
5. Subscription marked as cancelled
6. Receives cancellation email
7. Access continues until period end

### Flow 3: Hit Feature Limit

1. User tries to create meeting type (already has 1)
2. Sees limit modal
3. Clicks "Upgrade to Pro"
4. Redirects to subscription page
5. Completes subscription
6. Returns to feature creation

---

## 📝 Additional Notes

1. **Stripe Checkout**: Stripe handles the payment UI, so we only need pre-checkout and post-checkout pages.

2. **Crypto Payments**: Will use existing crypto payment flow UI, but need renewal reminder emails.

3. **Backward Compatibility**: UI should handle both domain subscriptions (old) and billing subscriptions (new).

4. **Accessibility**: Ensure all components are accessible (WCAG 2.1 AA).

5. **Dark Mode**: If your app supports dark mode, ensure all new components support it.

6. **Localization**: If your app is multilingual, ensure all copy can be translated.

---

## ✅ Checklist for Designer

- [ ] Billing dashboard page design
- [ ] Subscription selection page design
- [ ] Payment success page design
- [ ] Payment cancel page design
- [ ] Cancellation dialog/modal design
- [ ] Feature limit modals (5 different ones)
- [ ] Status badges design
- [ ] Loading states design
- [ ] Error states design
- [ ] Navigation updates design
- [ ] Email template designs (7 templates)
- [ ] Mobile responsive designs
- [ ] Dark mode designs (if applicable)
- [ ] Icon set
- [ ] Copy/content for all components
- [ ] User flow diagrams

---

## 📎 Reference Files

- Existing email templates: `src/emails/`
- Existing UI components: Check dashboard and account pages for styling patterns
- Existing modals/dialogs: Check for consistent modal design patterns

---

**Priority**: Start with billing dashboard and subscription selection pages, then move to emails and limit modals.
