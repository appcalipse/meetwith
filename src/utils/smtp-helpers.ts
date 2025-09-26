/* eslint-disable no-restricted-syntax */
import dns from 'dns'
import net from 'net'
import { promisify } from 'util'

const resolver = new dns.Resolver()
resolver.setServers(['8.8.8.8', '1.1.1.1']) // use public DNS servers

const resolveMx = promisify(resolver.resolveMx.bind(resolver))
const resolve4 = promisify(resolver.resolve4.bind(resolver))

async function getPrimaryMxHost(domain: string): Promise<string> {
  try {
    const mx = await resolveMx(domain)
    mx.sort((a, b) => a.priority - b.priority)
    return mx[0].exchange.replace(/\.$/, '')
  } catch (err) {
    // fallback -> use domain A record if no MX
    const addresses = await resolve4(domain).catch(() => [])
    if (addresses.length) return domain
    throw err
  }
}

function connectToIp(ip: string, port = 25, timeout = 7000): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = net.createConnection({ host: ip, port, timeout })
    s.on('connect', () => {
      s.end()
      resolve()
    })
    s.on('error', e => reject(e))
    s.on('timeout', () => {
      s.destroy()
      reject(new Error('connect timeout'))
    })
  })
}
export const handleEmailCheck = async (email: string) => {
  const domain = email.split('@')[1]
  if (!domain) {
    throw new Error('Invalid email')
  }

  console.log('Checking domain:', domain)
  try {
    const mxHost = await getPrimaryMxHost(domain)
    console.log('Primary MX host:', mxHost)

    const ips = await resolve4(mxHost).catch(() => [])
    console.log('Resolved A records for MX:', ips)

    if (ips.length === 0) {
      console.log('No A records found for MX; unable to probe TCP connection.')
      throw new Error('No A records found for MX')
    }

    const ip = ips[0]
    console.log('Attempting TCP connect to', ip, 'port 25')
    await connectToIp(ip, 25, 8000)
    console.log(
      'TCP connect succeeded — server reachable. You can proceed with SMTP handshake.'
    )
  } catch (err: unknown) {
    if (!(err instanceof Error)) {
      throw new Error('Unknown error occurred')
    } else {
      console.error('Failed:', (err as any)?.code || '', err.message)
      throw new Error('Email domain is not reachable')
    }
  }
}
