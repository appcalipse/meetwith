# Meta WhatsApp API Integration Implementation Plan

## Overview

This document outlines the implementation plan for integrating Meta WhatsApp API into the Meetwith application. The integration will enable users to connect their WhatsApp accounts to receive meeting notifications and communicate with the system via WhatsApp.

## Project Understanding

Meetwith is a web application that allows users to schedule meetings using their crypto wallets. It currently supports calendar integrations with:

- Google Calendar
- Office365 (Microsoft)
- iCloud
- Generic CalDav providers

## Implementation Strategy

The WhatsApp API integration will follow the same architectural patterns as existing calendar integrations, focusing on notification and communication capabilities.

## Key Components

### 1. WhatsApp Service Integration

#### WhatsApp Service Class

- **File**: `src/utils/services/whatsapp.service.ts`
- Implement service class following existing calendar service patterns
- Handle authentication with WhatsApp Business API
- Implement methods for sending messages and notifications

#### WhatsApp Credentials Type

- **File**: `src/types/WhatsAppCredentials.ts`
- Define structure for WhatsApp API credentials
- Include necessary authentication parameters

### 2. Integration with Existing Calendar Architecture

#### Update TimeSlotSource Enum

- **File**: `src/types/Meeting.ts`
- Add `WHATSAPP` to `TimeSlotSource` enum

#### WhatsApp Integration Factory

- **File**: `src/utils/services/connected_calendars.factory.ts`
- Add WhatsApp service to factory pattern
- Handle WhatsApp credentials appropriately

### 3. API Routes

#### WhatsApp Integration Endpoint

- **File**: `src/pages/api/secure/calendar_integrations/whatsapp.ts`
- API endpoint for connecting WhatsApp accounts
- Handle authorization and credential storage
- Implement validation methods

#### WhatsApp Notification Service

- **File**: `src/utils/services/whatsapp-notification.service.ts`
- Service for sending WhatsApp notifications
- Integration with existing meeting systems

### 4. Database Integration

#### Database Schema Update

- **File**: `src/utils/database`
- Add WhatsApp integration support in database models
- Store WhatsApp credentials (encrypted)

### 5. UI Components

#### WhatsApp Integration UI

- **Directory**: `src/components/whatsapp`
- Component for connecting WhatsApp account
- Settings UI for WhatsApp integration

## Implementation Steps

### Step 1: Create WhatsApp Service Class

1. Implement WhatsApp service following existing patterns
2. Handle WhatsApp Business API communication
3. Implement core methods for message sending

### Step 2: Update Calendar Integration Factory

1. Add WhatsApp support to factory pattern
2. Ensure compatibility with existing codebase
3. Handle credential management properly

### Step 3: Add WhatsApp to TimeSlotSource Enum

1. Update `TimeSlotSource` enum with new `WHATSAPP` option
2. Ensure all references are updated properly

### Step 4: Create API Endpoint

1. Set up API endpoint for WhatsApp integration
2. Handle authentication and credential management
3. Implement proper error handling

### Step 5: Add UI Components

1. Create components for connecting WhatsApp
2. Integrate with existing settings UI
3. Implement proper validation and error states

### Step 6: Testing

1. Unit tests for new components
2. Integration tests for API endpoints
3. End-to-end testing of complete workflow

## Security Considerations

- Credentials will be stored encrypted in the database
- Follow existing security patterns in the codebase
- Implement proper authentication with Meta's API
- Use existing session and authentication mechanisms

## Configuration Requirements

The integration will require:

- WhatsApp Business API credentials from Meta
- Proper setup in the project's environment variables
- Configuration in the existing credential management system

## API Endpoints to Create

Based on existing patterns, we'll need:

- `POST /api/secure/calendar_integrations/whatsapp/connect` - Connect WhatsApp account
- `GET /api/secure/calendar_integrations/whatsapp` - List connected WhatsApp accounts
- `DELETE /api/secure/calendar_integrations/whatsapp` - Remove WhatsApp integration

## Integration Points

The WhatsApp integration should integrate with:

- Existing calendar sync system
- Meeting scheduling system
- Notification system
- User account management

## References

- Existing calendar integration patterns in `src/pages/api/secure/calendar_integrations/`
- TimeSlotSource enum in `src/types/Meeting.ts`
- Connected calendar factory in `src/utils/services/connected_calendars.factory.ts`
- Session management in `src/middleware.ts`
