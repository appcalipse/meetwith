import { Box, List, ListItem, Text } from '@chakra-ui/react'

export const PrivacyPolicyContent = () => (
  <>
    <Text as="h2" color="text-primary" fontWeight={700} fontSize="xl" mt={4}>
      Privacy Policy
    </Text>
    <Text color="text-primary" fontSize="sm" mb={4}>
      Last revised: February 2025
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={4}>
      The Gist
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      Meetwith collects certain information to provide and improve our
      scheduling services. Here&apos;s what you need to know:
    </Text>
    <List
      as="ul"
      listStylePos="inside"
      color="text-primary"
      fontSize="sm"
      spacing={1}
    >
      <ListItem>
        We collect non-personally identifying information to understand how
        people use our platform
      </ListItem>
      <ListItem>
        We&apos;ll ask for your permission before collecting personal
        information like your name and email
      </ListItem>
      <ListItem>
        You control whether we can contact you for updates and marketing
      </ListItem>
      <ListItem>
        We use cookies to make the platform work better (but you can opt out)
      </ListItem>
      <ListItem>
        We support crypto and traditional payments, and we protect your payment
        data
      </ListItem>
      <ListItem>
        We take security seriously and follow industry best practices
      </ListItem>
    </List>
    <Text color="text-primary" fontSize="sm" my={3}>
      You must read and agree to this entire Privacy Policy before using
      Meetwith.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Information We Collect
    </Text>
    <Text as="h4" color="text-primary" fontWeight={500} fontSize="md" mt={3}>
      Visitors
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      Like most websites, Meetwith collects non-personally-identifying
      information such as browser type, language preference, referring site, and
      the date and time of each visit. We use this to understand how people use
      our platform and occasionally publish aggregated trends (never individual
      data).
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We also collect IP addresses to maintain security and block users who
      violate our Terms of Service. We don&apos;t use IP addresses to identify
      individual visitors except in these circumstances.
    </Text>
    <Text as="h4" color="text-primary" fontWeight={500} fontSize="md" mt={3}>
      Account Holders and Users
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      When you create a Meetwith account or book a meeting, we collect:
    </Text>
    <List
      as="ul"
      listStylePos="inside"
      color="text-primary"
      fontSize="sm"
      spacing={1}
    >
      <ListItem>
        <strong>Required information:</strong> Name, email address, and
        authentication data
      </ListItem>
      <ListItem>
        <strong>Optional information:</strong> Profile details, time zone,
        calendar preferences, and meeting preferences
      </ListItem>
      <ListItem>
        <strong>Usage data:</strong> How you interact with our Service, which
        features you use, and meeting analytics
      </ListItem>
    </List>
    <Text color="text-primary" fontSize="sm" my={2}>
      <strong>Marketing Communications:</strong> When you sign up or use our
      Service, we&apos;ll ask for your explicit permission to send you product
      updates and new feature announcements, share relevant content and
      educational materials, and notify you about special offers or promotions.
      You can opt out at any time through your account settings or by clicking
      &quot;unsubscribe&quot; in any email.
    </Text>
    <Text as="h4" color="text-primary" fontWeight={500} fontSize="md" mt={3}>
      Payment Information
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      Meetwith supports crypto payments (Arbitrum and Celo), traditional
      payments via Stripe, and manual invoicing for enterprise clients. We
      don&apos;t store credit card numbers or crypto wallet private keys.
      Payment processing is handled by our secure partners.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      How We Use Your Information
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We use the information we collect to provide, maintain, and improve the
      Meetwith Service; process bookings and payments; send service-related and
      (with permission) marketing communications; respond to support requests;
      detect and prevent fraud; and comply with legal obligations.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Sharing Your Information
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We only share your information with service providers who help us operate
      the platform, when required by law, or with your consent. We will never
      sell your personal information.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Your Rights and Choices
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      You have the right to access, correct, delete, export your data, object to
      certain processing, and withdraw consent for marketing at any time.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Data Retention
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We retain your personal information while your account is active or as
      needed to provide services. If you delete your account, we&apos;ll remove
      your data within 90 days, except where legally required or as
      anonymized/transaction records.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Cookies and Tracking
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We use cookies to keep you logged in, remember preferences, and understand
      how you use our Service. You can disable cookies in your browser; some
      features may not work without them.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Data Security
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We implement reasonable security measures to protect your information. No
      internet transmission is 100% secure; we cannot guarantee absolute
      security.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      International Data Transfers
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      Your information may be transferred to servers outside your country. By
      using Meetwith, you consent to these transfers. We ensure appropriate
      safeguards.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      GDPR Compliance
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      If you&apos;re in the EEA, you have additional rights (e.g. data
      portability, restrict processing, object to automated decisions, lodge a
      complaint). Our legal bases include consent, contract performance,
      legitimate interests, and legal obligations.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Changes to This Policy
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      We may update this policy and will notify you of significant changes by
      posting here, updating the &quot;Last revised&quot; date, and (for
      material changes) emailing you. Continued use after changes constitutes
      acceptance.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Data Storage
    </Text>
    <Text color="text-primary" fontSize="sm" my={2}>
      Meetwith uses third-party vendors for infrastructure and storage. Your
      data is stored on their servers; we ensure they meet appropriate security
      standards.
    </Text>

    <Text as="h3" color="text-primary" fontWeight={600} fontSize="lg" mt={6}>
      Reuse
    </Text>
    <Text color="text-primary" fontSize="sm" my={2} pb={4}>
      This document is partially based upon the Automatic Privacy Policy and is
      licensed under Creative Commons Attribution Share-Alike License 2.5.
      Automattic is not connected with and does not sponsor or endorse Meetwith.
    </Text>

    <Box pt={4} pb={2}>
      <Text color="text-primary" fontSize="sm" fontWeight={500} mb={2}>
        We&apos;re updating how we communicate with you to make sure we have
        your clear permission.
      </Text>
      <Text color="text-primary" fontSize="sm" fontWeight={600} mb={3}>
        Please confirm your preferences:
      </Text>
      <Text color="text-primary" fontSize="sm" mb={3}>
        What we&apos;d like permission for:
      </Text>
    </Box>
  </>
)
