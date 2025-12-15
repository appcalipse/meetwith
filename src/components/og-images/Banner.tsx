import * as React from 'react'

import { Jazzicon } from './jazzicon'

interface UserBannerProps {
  banner_url: string | null
  avatar_url: string | null
  owner_account_address: string
  description: string | null
  name: string | null
  calendar_url: string
}
const MAX_DESCRIPTION_LENGTH = 120
const truncateText = (text: string | null, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}
const UserBanner: React.FC<UserBannerProps> = ({
  avatar_url,
  banner_url,
  calendar_url,
  description,
  owner_account_address,
  name,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundImage: 'linear-gradient(180deg, #1F2933 0%, #131A20 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          flex: 1,
          padding: '24px',
          paddingBottom: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element*/}
          <img
            style={{
              width: '100%',
              height: '100%',
              inset: '0',
              position: 'absolute',
              objectFit: 'cover',
            }}
            src={
              banner_url ||
              'https://mww-public.s3.eu-west-1.amazonaws.com/default-banner.png'
            }
            alt="Banner Image"
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              paddingLeft: '83px',
              paddingRight: '83px',
              position: 'absolute',
              justifyContent: 'center',
              alignItems: 'flex-start',
              top: 0,
              gap: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100px',
                  height: '100px',
                  overflow: 'clip',
                }}
              >
                {avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={avatar_url}
                    src={avatar_url}
                    alt="Profile picture"
                    width="300"
                    height="300"
                    style={{
                      width: '100px',
                      height: '100px',
                    }}
                  />
                ) : (
                  <Jazzicon address={owner_account_address} />
                )}
              </div>
              <h2 style={{ color: 'white', fontWeight: 700, fontSize: '32px' }}>
                {name}
              </h2>
            </div>

            <p
              style={{
                fontSize: '32px',
                color: 'white',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                fontWeight: 500,
                lineHeight: '1.2',
              }}
            >
              {truncateText(description, MAX_DESCRIPTION_LENGTH)}
            </p>
          </div>
        </div>
      </div>
      <div
        style={{
          justifyContent: 'space-between',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          padding: '16px 24px',
          backgroundColor: '#F35826',
          height: '62px',
          fontWeight: 500,
          fontSize: '20px',
          color: 'white',
        }}
      >
        <span>{calendar_url}</span>
        <span>Powered by Meetwith</span>
      </div>
    </div>
  )
}

export default UserBanner
