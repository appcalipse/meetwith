import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { ConnectedCalendar } from '@/types/CalendarConnections'
import { ParticipantMappingType } from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

import { initDB } from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const db = await initDB()
    const { data, error } = await db.supabase
      .from('connected_calendars')
      .select()
      .in('id', [130])

    if (data) {
      const calendars = data as ConnectedCalendar[]

      for (const calendar of calendars) {
        const integration = getConnectedCalendarIntegration(
          calendar.account_address,
          calendar.email,
          calendar.provider,
          calendar.payload
        )

        const promises = []

        const meeting_id = 'meeting-id-to-test7'

        if (false) {
          for (const innerCalendar of calendar.calendars!) {
            if (innerCalendar.enabled && innerCalendar.sync) {
              await integration.deleteEvent(
                meeting_id,
                innerCalendar.calendarId
              )
            }
          }
        }

        if (true) {
          for (const innerCalendar of calendar.calendars!) {
            if (innerCalendar.enabled && innerCalendar.sync) {
              await integration.updateEvent(
                calendar.account_address,
                meeting_id,
                {
                  participantActing: {
                    name: '',
                    guest_email: 'apenasparaspam@gmail.com',
                  },
                  participants: [
                    {
                      account_address:
                        '0xe5b06bfd663c94005b8b159cd320fd7976549f9b',
                      slot_id: '36d3e813-556c-4857-927c-7700afb611f3',
                      type: ParticipantType.Owner,
                      meeting_id: 'c10feec4-d31d-4e26-84c8-fa19440bad24',
                      privateInfo: {
                        iv: 'e7b916d69e9a749bb1cc17ce617dfa3d',
                        ephemPublicKey:
                          '049a725179107b438dab78cefd220122bc7932527da88f4a00373da1a63a30dcbc1a46fcbea7f5d90d22f7d774d07f83ec2b4fd57f6128e3bccbf6a728054e4bce',
                        ciphertext:
                          '443bc0e0482da9f73aeafeb3529bec8b3d33caeda2aa2227144128d156a9be9da34713d5f1b0fd2daf705fccca2680060d3902fc233f8793d8ee370d518f55e8f9a3d96ea1176803891140b39fd221ff3938a8f52f64cd912022688bf2bdcd29d604586ffde5bdeb9bf4d7b170c60b116e4a74a5f09cc42c2586172302e89e501d7b1ec8b703b52f3c15703c9c55d385b52eb24dbbf2a4de3b2a461241288b2de15e3a3094eb1666c3aa9de403684bdc741ab7522a73da3b4142b2827eb02835972a6284afa96be9b82b46be155b3a945afd74c7b4eb8908f872f051223fe0e00da05cf70cd556d376be078fb2a9cf0ee6a5722980f70f79b4206e81e3060be91f7767c1ec586e1a8db5a8c10c4ad991bf8d477190f9a14debf038226e0d775244d0abaa5f3cc3e04a5ea935f5d6be2cd7b069d42bcfb2cd6b5f4cba3d9ede27543701a1bbaa5b84c34b795a2c5769e91e21e1e6fc405fefa2ee3b40545ce88747ac8c3769143cb50bd19d824517f7790c3d735bf527be5d2e7f87692221842504f9943057f1c6ef69f497843f7d7833fc3fbac71782fd9fa8fa0d4e96ee2a7146aed503db717d125a2874eedb4233a950af5a52d9245589c63853805322c1fed5f6c6f36605c49e1fc879ad699a6ed0fb642a801c143a08296397b4990d47f2241a78cf13922a79d3935e9f43a9dc90e5864243d4c7c3de98f0b8488435d2bf3850c26028bc4eb9a6fbf1ae9f0a985c401ba11bb1a15f4ffe6ffad52f4aa64586b70fc3578d0326c30aece24c36a5e507128e182b2610990cb48856690b00ce2575380ed680ac4fc2e420c93b87f108',
                        mac: 'b0c8e3c8f76153c908756c309d1b88af156b461c8bf5e8bd101c9916f002a91c',
                      },
                      privateInfoHash: 'f19426140f1592f05ae10d9c76a609b5',
                      timeZone: 'Europe/Lisbon',
                      name: '9tails.eth',
                      status: ParticipationStatus.Pending,
                      mappingType: ParticipantMappingType.ADD,
                    },
                    {
                      account_address: '',
                      slot_id: '36e028cf-4c4c-426e-989b-8c12ab2e0030',
                      type: ParticipantType.Scheduler,
                      meeting_id: 'c10feec4-d31d-4e26-84c8-fa19440bad24',
                      privateInfo: {
                        iv: 'acb036e70a2a6106415c2841657040cb',
                        ephemPublicKey:
                          '04d081f98b5750e2b03b9d9dfdd0d2c83cefeb3e481422fe482697d2bc9e4792e6f8d4a3517b44d71c9ab08c25c89528ed3d621f16d150b214c7340f5ac85cf7cf',
                        ciphertext:
                          '3d65a6c6c6ec5a06923e8b41aa8800adafa23ddf6b6abbd66cc1e5223e44407c0986d49fcebd9528901c161f4b358606654afab1b890a4968322193c88e5634f84f6dae41af5e94348f3b54b9dfd94674f95aef894726f1a7a5084e7b870811516ef02ac9f5a01eb990dfb1580a45ac28992b39d31c3fe7032782c75969a7c24473829b02a106029d5e768484bd79470220d1452f59d0d6b5a7c34f5269b8ce046e74e447119adc721229a05565377de0eb0809d180b5c7ac83af92b0549f30ae059a95c958c342a4dc6ea8a9360242b629fd7df589c9bc92ab5532de160eabd5e98f8164b9412c29857e576481bc373cb7aee2d50f271e7dfda5f0c7e995bedd00daabc72c00d131028928d261468d89fea778e6dd52ddc5bf1d929349ddbfab4b9372704d316914bcc7d1bb95ec8fbc9f1552162b975dc2d42f9a1b2d61513f39b79b3f20e2e91e99b45a2168d70e74af78fa6f9b5ad3d9b69dfe94cffd00a32f968cdf4ec3bc72a3506f95ff6eecdb39e263c48ca499307bb5e5742fe39dc844ffc8146b2c630fdb92ca53e99e066f5302f824364c442994255bfaeec21494c9eda3adfc734904af9d3e955747fd69d3f2b0453dc3e4c6a7c292259995fb8075981c694afb947cf8b7875eb66e9f3442c19d76a56bd838e481541c3fcfb4109c7340aa8bd52bfa4c93d344d95cad4301a338b134d1b5f78e5bd8161260661ff35eee87a5abba46b5b2072009e397521184b28daea01ec7084b1269cbc37d6d9429695c9a119ec2575b87d40ae8e5b6912f5d8ac4c911fa4c944ae0b0880c5619ae12c0425af6045c14fa14399191a53f60320579294869dff6ca9e63f4652b238f99cb5827fd8fe4af2827c3fee6a',
                        mac: '9b2af1b9a43ce5062bfb96e4e04717cc6d0e53271ba61d477ebe87f906413d72',
                      },
                      privateInfoHash: '880f34af1e8f7a145e19727ff000abe3',
                      timeZone: 'Europe/Lisbon',
                      name: '',
                      guest_email: 'apenasparaspam@gmail.com',
                      status: ParticipationStatus.Pending,
                      mappingType: ParticipantMappingType.ADD,
                    },
                  ],
                  start: new Date('2022-10-20 17:00:00'),
                  end: new Date('2022-10-20 18:00:00'),
                  created_at: new Date(),
                  meeting_url:
                    'https://meetwithwallet.huddle01.com/twx-yjqn-fgn',
                  meeting_id,
                  timezone: 'Europe/Lisbon',
                },
                innerCalendar.calendarId
              )
            }
          }
        }

        if (false) {
          for (const innerCalendar of calendar.calendars!) {
            if (innerCalendar.enabled && innerCalendar.sync) {
              promises.push(
                new Promise<void>(async resolve => {
                  try {
                    await integration.createEvent(
                      calendar.account_address,
                      {
                        participantActing: {
                          name: '',
                          guest_email: 'apenasparaspam@gmail.com',
                        },
                        participants: [
                          {
                            account_address:
                              '0xe5b06bfd663c94005b8b159cd320fd7976549f9b',
                            slot_id: '36d3e813-556c-4857-927c-7700afb611f3',
                            type: ParticipantType.Owner,
                            meeting_id: 'c10feec4-d31d-4e26-84c8-fa19440bad24',
                            privateInfo: {
                              iv: 'e7b916d69e9a749bb1cc17ce617dfa3d',
                              ephemPublicKey:
                                '049a725179107b438dab78cefd220122bc7932527da88f4a00373da1a63a30dcbc1a46fcbea7f5d90d22f7d774d07f83ec2b4fd57f6128e3bccbf6a728054e4bce',
                              ciphertext:
                                '443bc0e0482da9f73aeafeb3529bec8b3d33caeda2aa2227144128d156a9be9da34713d5f1b0fd2daf705fccca2680060d3902fc233f8793d8ee370d518f55e8f9a3d96ea1176803891140b39fd221ff3938a8f52f64cd912022688bf2bdcd29d604586ffde5bdeb9bf4d7b170c60b116e4a74a5f09cc42c2586172302e89e501d7b1ec8b703b52f3c15703c9c55d385b52eb24dbbf2a4de3b2a461241288b2de15e3a3094eb1666c3aa9de403684bdc741ab7522a73da3b4142b2827eb02835972a6284afa96be9b82b46be155b3a945afd74c7b4eb8908f872f051223fe0e00da05cf70cd556d376be078fb2a9cf0ee6a5722980f70f79b4206e81e3060be91f7767c1ec586e1a8db5a8c10c4ad991bf8d477190f9a14debf038226e0d775244d0abaa5f3cc3e04a5ea935f5d6be2cd7b069d42bcfb2cd6b5f4cba3d9ede27543701a1bbaa5b84c34b795a2c5769e91e21e1e6fc405fefa2ee3b40545ce88747ac8c3769143cb50bd19d824517f7790c3d735bf527be5d2e7f87692221842504f9943057f1c6ef69f497843f7d7833fc3fbac71782fd9fa8fa0d4e96ee2a7146aed503db717d125a2874eedb4233a950af5a52d9245589c63853805322c1fed5f6c6f36605c49e1fc879ad699a6ed0fb642a801c143a08296397b4990d47f2241a78cf13922a79d3935e9f43a9dc90e5864243d4c7c3de98f0b8488435d2bf3850c26028bc4eb9a6fbf1ae9f0a985c401ba11bb1a15f4ffe6ffad52f4aa64586b70fc3578d0326c30aece24c36a5e507128e182b2610990cb48856690b00ce2575380ed680ac4fc2e420c93b87f108',
                              mac: 'b0c8e3c8f76153c908756c309d1b88af156b461c8bf5e8bd101c9916f002a91c',
                            },
                            privateInfoHash: 'f19426140f1592f05ae10d9c76a609b5',
                            timeZone: 'Europe/Lisbon',
                            name: '9tails.eth',
                            status: ParticipationStatus.Pending,
                            mappingType: ParticipantMappingType.ADD,
                          },
                          {
                            account_address: '',
                            slot_id: '36e028cf-4c4c-426e-989b-8c12ab2e0030',
                            type: ParticipantType.Scheduler,
                            meeting_id: 'c10feec4-d31d-4e26-84c8-fa19440bad24',
                            privateInfo: {
                              iv: 'acb036e70a2a6106415c2841657040cb',
                              ephemPublicKey:
                                '04d081f98b5750e2b03b9d9dfdd0d2c83cefeb3e481422fe482697d2bc9e4792e6f8d4a3517b44d71c9ab08c25c89528ed3d621f16d150b214c7340f5ac85cf7cf',
                              ciphertext:
                                '3d65a6c6c6ec5a06923e8b41aa8800adafa23ddf6b6abbd66cc1e5223e44407c0986d49fcebd9528901c161f4b358606654afab1b890a4968322193c88e5634f84f6dae41af5e94348f3b54b9dfd94674f95aef894726f1a7a5084e7b870811516ef02ac9f5a01eb990dfb1580a45ac28992b39d31c3fe7032782c75969a7c24473829b02a106029d5e768484bd79470220d1452f59d0d6b5a7c34f5269b8ce046e74e447119adc721229a05565377de0eb0809d180b5c7ac83af92b0549f30ae059a95c958c342a4dc6ea8a9360242b629fd7df589c9bc92ab5532de160eabd5e98f8164b9412c29857e576481bc373cb7aee2d50f271e7dfda5f0c7e995bedd00daabc72c00d131028928d261468d89fea778e6dd52ddc5bf1d929349ddbfab4b9372704d316914bcc7d1bb95ec8fbc9f1552162b975dc2d42f9a1b2d61513f39b79b3f20e2e91e99b45a2168d70e74af78fa6f9b5ad3d9b69dfe94cffd00a32f968cdf4ec3bc72a3506f95ff6eecdb39e263c48ca499307bb5e5742fe39dc844ffc8146b2c630fdb92ca53e99e066f5302f824364c442994255bfaeec21494c9eda3adfc734904af9d3e955747fd69d3f2b0453dc3e4c6a7c292259995fb8075981c694afb947cf8b7875eb66e9f3442c19d76a56bd838e481541c3fcfb4109c7340aa8bd52bfa4c93d344d95cad4301a338b134d1b5f78e5bd8161260661ff35eee87a5abba46b5b2072009e397521184b28daea01ec7084b1269cbc37d6d9429695c9a119ec2575b87d40ae8e5b6912f5d8ac4c911fa4c944ae0b0880c5619ae12c0425af6045c14fa14399191a53f60320579294869dff6ca9e63f4652b238f99cb5827fd8fe4af2827c3fee6a',
                              mac: '9b2af1b9a43ce5062bfb96e4e04717cc6d0e53271ba61d477ebe87f906413d72',
                            },
                            privateInfoHash: '880f34af1e8f7a145e19727ff000abe3',
                            timeZone: 'Europe/Lisbon',
                            name: '',
                            guest_email: 'apenasparaspam@gmail.com',
                            status: ParticipationStatus.Pending,
                            mappingType: ParticipantMappingType.ADD,
                          },
                        ],
                        start: new Date('2022-10-20 10:00:00'),
                        end: new Date('2022-10-20 11:00:00'),
                        created_at: new Date(),
                        meeting_url:
                          'https://meetwithwallet.huddle01.com/twx-yjqn-fgn',
                        meeting_id,
                        timezone: 'Europe/Lisbon',
                      },
                      new Date(),
                      innerCalendar.calendarId
                    )
                  } catch (error) {
                    console.log(calendar.provider, error)
                  }
                  resolve()
                })
              )
            }
          }
          await Promise.all(promises)
        }
      }
    }
  }

  res.status(404).send('Not found')
})
