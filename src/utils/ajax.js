import { CSRFProtection } from './csrf'
import { fire } from './event'

// Default ajax function, may be overridden with custom function in $.rails.ajax
const AcceptHeaders = {
  '*': '*/*',
  text: 'text/plain',
  html: 'text/html',
  xml: 'application/xml, text/xml',
  json: 'application/json, text/javascript',
  script: 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript'
}

export function ajax(options) {
  let httpRequest = new XMLHttpRequest(), accept

  // Prepare options
  options.type = options.type.toUpperCase()
  if (!options.url) {
    // Get current location (the same way jQuery does)
    try {
      options.url = location.href
    } catch(err) {
      let a = document.createElement( 'a' )
      a.href = ''
      options.url = a.href
    }
  }
  // If it's a GET request
  // 1. strip query string (even if no content is submit)
  // 2. append data to url
  if (options.type === 'GET') {
    options.url = options.url.replace(/\?.+$/, '')
    if (options.data) {
      options.url += '?' + options.data
    }
  }
  if (!AcceptHeaders[options.dataType]) {
    options.dataType = '*'
  }
  accept = AcceptHeaders[options.dataType]
  if (options.dataType !== '*') {
    accept += ', */*; q=0.01'
  }

  // Open and setup httpRequest
  httpRequest.open(options.type, options.url, true)

  httpRequest.setRequestHeader('Accept', accept)
  // Set Content-Type only when sending a string
  // Sending FormData will automatically set Content-Type to multipart/form-data
  if (typeof options.data === 'string') {
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
  }
  if (!options.crossDomain) {
    httpRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
  }
  if (options.withCredentials) {
    httpRequest.withCredentials = true
  }
  CSRFProtection(httpRequest)
  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      ajaxHandleResponses(httpRequest, options.success, options.error, options.complete)
    }
  }

  // Call beforeSend hook
  if (options.beforeSend && options.beforeSend(httpRequest, options) === false) {
    httpRequest.abort()
    fire(document, 'ajaxStop')
    return
  }

  if (httpRequest.readyState === XMLHttpRequest.OPENED) {
    httpRequest.send(options.data)
  }
}

function ajaxHandleResponses(httpRequest, success, error, complete) {
  let type = httpRequest.getResponseHeader('Content-Type'),
      response = httpRequest.response

  if (typeof response === 'string') {
    if (type.match(/\bjson\b/)) {
      try {
        response = JSON.parse(response)
      } catch (e) {
        // pass
      }
    } else if (type.match(/\bjavascript\b/)) {
      let script = document.createElement('script')
      script.innerHTML = response
      document.body.appendChild(script)
    } else if (type.match(/\b(xml|html|svg)\b/)) {
      let parser = new DOMParser()
      type = type.replace(/;.+/, '') // remove something like ';charset=utf-8'
      try {
        response = parser.parseFromString(response, type)
      } catch (e) {
        // pass
      }
    }
  }
  if (Math.floor(httpRequest.status / 100) === 2) {
    success(response, httpRequest.statusText, httpRequest)
  } else {
    error(response, httpRequest.statusText, httpRequest)
  }
  complete(httpRequest, httpRequest.statusText)
}

// Default way to get an element's href. May be overridden at $.rails.href.
export function href(element) {
  return element.href
}

// Determines if the request is a cross domain request.
export function isCrossDomain(url) {
  var originAnchor = document.createElement('a')
  originAnchor.href = location.href
  var urlAnchor = document.createElement('a')

  try {
    urlAnchor.href = url
    // This is a workaround to a IE bug.
    urlAnchor.href = urlAnchor.href

    // If URL protocol is false or is a string containing a single colon
    // *and* host are false, assume it is not a cross-domain request
    // (should only be the case for IE7 and IE compatibility mode).
    // Otherwise, evaluate protocol and host of the URL against the origin
    // protocol and host.
    return !(((!urlAnchor.protocol || urlAnchor.protocol === ':') && !urlAnchor.host) ||
      (originAnchor.protocol + '//' + originAnchor.host ===
        urlAnchor.protocol + '//' + urlAnchor.host))
  } catch (e) {
    // If there is an error parsing the URL, assume it is crossDomain.
    return true
  }
}
