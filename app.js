const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const cors = require('koa2-cors')
const app = new Koa()
const request = require('request')
const rp = require('request-promise')
const queryString = require('querystring')

const allHeaders = require('./headers.js')
// request.defaults({ jar: true })

const cookieParser = async (ctx, next) => {
	const cookieHeaders = ctx.cookies.request.headers.cookie
	if (cookieHeaders) {
		const cookieArr = cookieHeaders.split(';')
		cookieArr.forEach((item) => {
			const itemArr = item.split('=')
			if (itemArr.length > 1) ctx.cookie[itemArr[0].trim()] = itemArr[1].trim()
		})
	}
	await next()
}
const router = async (ctx, next) => {
	// const origin = ctx.path.slice(0,3) === '/m/' ? 'https://m.weibo.cn/' : 'https://m.weibo.cn/'
	// const path = ctx.path.slice(2)
	// const h2Header = {
	// 	':authority': 'm.weibo.cn',
	// 	':method': ctx.method.toUpperCase(),
	// 	':path': ctx.path,
	// 	':scheme': 'https'
	// }

	const { method } = ctx
	// const cookie = ctx.cookies.get()
	// const headers = {
	// 	// 'Host':'api.weibo.cn',
	// 	// 	Accept: '*/*',

	// 	Connection: 'keep-alive',
	// 	Origin: host,
	// 	Host: 'passport.weibo.cn',
	// 	referer: 'https://passport.weibo.cn/signin/login?entry=mweibo&res=wel&wm=3349&r=https%3A%2F%2Fm.weibo.cn%2F',
	// 	// 'mweibo-pwa': 1,
	// 	Pragma: 'no-cache',
	// 	'user-agent':
	// 		'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
	// }
	const headers = {
		'cache-control': 'no-cache',
		'mweibo-pwa': 1,
		// Connection: 'keep-alive',
		pragma: 'no-cache',
		referer: 'https://m.weibo.cn/',
		cookie: ctx.headers.cookie,
		'user-agent':
			'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
	}
	if (method.toUpperCase() === 'POST') {
		headers['content-type'] = 'application/x-www-form-urlencoded'
	}
	const options = {
		method,
		headers,
		// url: `https://passport.weibo.cn/sso/login`,
		url: `https://m.weibo.cn${ctx.path}`,
		body: queryString.stringify(ctx.request.body),
		qs: ctx.query,
		resolveWithFullResponse: true
	}
	const origin = ctx.path.split('/')[1]
	const originHeader = allHeaders[origin]
	if (originHeader) {
		const host = originHeader['origin']
		const cpath = ctx.path.replace(`/${origin}`, '')
		options.url = `${host}${cpath}`
		options.headers = { ...headers, ...originHeader }
		options.gzip = true
	}

	// const j = request.jar()
	// const cookie = request.cookie(ctx.headers.cookie)
	// const url = 'http://passport.weibo.cn'
	// j.setCookie(cookie, url)
	// options.jar = j
	await rp(options)
		// request({
		// 	methods:ctx.method,
		// 	url: `https://m.weibo.cn/${ctx.path}`,
		// 	headers:ctx.header
		//
		.then(
			(res) => {
				const { headers, body, statusCode } = res
				headers['transfer-encoding'] && delete headers['transfer-encoding']
				headers['content-encoding'] && delete headers['content-encoding']
				if (headers['set-cookie']) {
					headers['set-cookie'] = headers['set-cookie'].map((v) => v.replace('.weibo.cn', ctx.hostname))
				}

				ctx.body = body
				ctx.code = statusCode
				ctx.set(headers)
			},
			(error) => {
				console.log(error)
			}
		)
	next()
}

app.use(bodyParser())
app.use(cors())
app.use(router)
app.listen(3001)
