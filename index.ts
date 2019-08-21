import * as Koa from 'koa'
import * as request from 'superagent'
import * as parse from 'co-body'

const app = new Koa()
const CORP_SECRET = {
  '1000002': 'm3hof58HyJhozBTdpfNdSrmgOtsV3YCj6SUn7ogO8qM',
  '1000003': 'TWH170it10JTzQ5LkuY8AtBkIiy0mzGYW6C3bDRiHPw'
}

const WX = 'https://qyapi.weixin.qq.com/cgi-bin'
let access_token
const wxsend = async (agentid: string, subject: string, message: string) => {
  if (!access_token) {
    const res = await request.get(`${WX}/gettoken`).query({ corpid: process.env.CORP_ID, corpsecret: CORP_SECRET[agentid] })
    access_token = res.body.access_token
    setTimeout(() => access_token = null, res.body.expires_in * 1000)
  }
  
  let content: string
  if (typeof(message) === 'string') {
    try {
      message = JSON.parse(message)
    } catch (error) {
    }
  }
  console.log({ message, subject })
  if (typeof(message) === 'object') {
    const { applicationName, deploymentId, deploymentGroupName, instanceStatus, status } = message
    if (status) {
      content = `${applicationName}/${deploymentGroupName} Deploy ${status} (deploymentId=${deploymentId})`
    } else if (instanceStatus) {
      content = `${applicationName}/${deploymentGroupName} Deploy ${status} (deploymentId=${deploymentId})`
    } else {
      content = `${subject}\n${JSON.stringify(message, null, 2)}`
    }
  } else {
    content = `${subject}: ${message}`
  }

  // https://work.weixin.qq.com/api/doc#90000/90135/90236
  const res = await request.post(`${WX}/message/send`).query({ access_token }).send({
    touser: "@all",
    msgtype: 'text',
    agentid,
    text: { content },
    safe: 0
  })
  return res
}

app.use(async ctx => {
  const messageType = ctx.header['x-amz-sns-message-type']
  if (messageType === 'SubscriptionConfirmation') {
    const { SubscribeURL } = await parse.json(ctx)
    await request.get(SubscribeURL)
    ctx.body = { SubscribeURL }
  } else if (messageType === 'Notification') {
    const { Subject, Message } = await parse.json(ctx)
    const { agentid } = ctx.request.query
    const res = await wxsend(agentid, Subject, Message)
    ctx.body = res.body
  } else {
    ctx.status = 404
  }
})

const port = process.env.PORT || 3030
app.listen(port, () => {
  console.log(`app.listen(${port})`)
})