import { Ok, Err } from './result';
import { Future, FutureEnd, Async } from './future';

export const enum Method {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
    Delete = 'DELETE',
    Head = 'HEAD',
    Patch = 'PATCH',
    Options = 'OPTIONS',
}

function uploadable(method: Method): boolean {
    return method == Method.Post || method == Method.Put || method == Method.Patch;
}

function downloadable(method: Method): boolean {
    return method != Method.Head && method != Method.Delete && method != Method.Options;
}

export interface Headers {
    [name: string]: string;
}

export interface Request {
    method: Method;
    url: string;
    headers?: Headers;
    body?: Buffer;
}

export interface Response {
    status: ResponseStatus;
    headers: Headers;
    body?: Buffer;
}

export const enum InfoCode {
    Continue = 100,
    SwitchProto = 101,
    Processing = 102,
}

export class InfoStatus {
    public code: InfoCode;
    public message: string;
    constructor(code: number, message: string) {
        this.code = code;
        this.message = message;
    }
}

export const enum SuccessCode {
    Ok = 200,
    Created = 201,
    Accepted = 202,
    NonAuthoritative = 203,
    NoContent = 204,
    ResetContent = 205,
    PartialContent = 206,
    MultiStatus = 207,
    AlreadyReported = 208,
}

export class SuccessStatus {
    public code: SuccessCode;
    public message: string;
    constructor(code: number, message: string) {
        this.code = code;
        this.message = message;
    }
}

export const enum RedirectCode {
    MultipleChoices = 300,
    MovedPermanently = 301,
    Found = 302,
    MovedTemporarily = 302,
    SeeOther = 303,
    NotModified = 304,
    UseProxy = 305,
    TemporarilyRedirect = 307,
    PermanentRedirect = 308,
}

export class RedirectStatus {
    public code: RedirectCode;
    public message: string;
    constructor(code: number, message: string) {
        this.code = code;
        this.message = message;
    }
}

export type ResponseStatus = InfoStatus | SuccessStatus | RedirectStatus;

export const enum ClientCode {
    BadRequest = 400,
    Unauthorized = 401,
    PaymentRequired = 402,
    Forbidden = 403,
    NotFound = 404,
    NotAllowed = 405,
    NotAcceptable = 406,
    ProxyAuthRequired = 407,
    RequestTimeout = 408,
    Conflict = 409,
    Gone = 410,
    LengthRequired = 411,
    PreconditionFailed = 412,
    PayloadTooLarge = 413,
    UriTooLong = 414,
    UnsupportedMediaType = 415,
    RangeNotSatisfiable = 416,
    ExpectationFailed = 417,
    ImTeapot = 418,
    MisdirectedRequest = 421,
    UnprocessableEntity = 422,
    Locked = 423,
    FailedDependency = 424,
    UpgradeRequired = 426,
    PreconditionRequired = 428,
    TooManyRequests = 429,
    HeadersTooLarge = 431,
    NoHeadersClose = 444,
    RetryWith = 449,
    UnavailableForLegalReasons = 451,
}

export class ClientError extends Error {
    public code: ClientCode;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

export const enum ServerCode {
    InternalServerError = 500,
    NotImplemented = 501,
    BadGateway = 502,
    ServiceUnavailable = 503,
    GatewayTimeout = 504,
    HttpVersionNotSupported = 505,
    VariantAlsoNegotiates = 506,
    InsufficientStorage = 507,
    LoopDetected = 508,
    BandwidthLimitExceeded = 509,
    NotExtended = 510,
    NetworkAuthRequired = 511,
    UnknownError = 520,
    WebServerIsDown = 521,
    ConnectionTimedOut = 522,
    OriginIsUnreachable = 523,
    TimeoutOccured = 524,
    SSLHandshakeFailed = 525,
    InvalidSSLCertificate = 526,
}

export class ServerError extends Error {
    public code: ServerCode;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

export type ResponseError = Error | ClientError | ServerError;

function parseHeaders(hs: string) {
    const h: Headers = {};
    for (let he of hs.split(/\r?\n/)) {
        const [f, v] = he.split(/:\s*/);
        if (v && v.length) {
            h[f.replace(/(:?^|\-)\w/g, c => c.toUpperCase())] = v;
        }
    }
    return h;
}

function xhr_on(xhr: XMLHttpRequest, future_end: FutureEnd<Response, ResponseError>, need_download: boolean) {
    switch (xhr.readyState) {
    case 4: { // done
        delete xhr.onreadystatechange;
        if (xhr.status >= 100 && xhr.status < 400) {
            const status: ResponseStatus =
                xhr.status < 200 ? new InfoStatus(xhr.status, xhr.statusText) :
                xhr.status < 300 ? new SuccessStatus(xhr.status, xhr.statusText) :
                new RedirectStatus(xhr.status, xhr.statusText);
            const headers = parseHeaders(xhr.getAllResponseHeaders());
            const res: Response = {status, headers};
            if (need_download) {
                res.body = download_done(xhr);
            }
            future_end.end(Ok(res));
        } else {
            const error: ResponseError =
                xhr.status < 500 ?
                new ClientError(xhr.status, xhr.statusText) :
                new ServerError(xhr.status, xhr.statusText);
            future_end.end(Err(error));
        }
    } break;
    }
};

export function request(req: Request): Future<Response, ResponseError> {
    const [future_end, future] = Async<Response, ResponseError>();

    let xhr: XMLHttpRequest;
    
    future_end.start(() => {
        xhr = new XMLHttpRequest();
        xhr.open(req.method, req.url, true);
        if (req.headers) {
            for (let name in req.headers) {
                xhr.setRequestHeader(name, req.headers[name]);
            }
        }
        const need_upload = uploadable(req.method);
        const need_download = downloadable(req.method);
        xhr.onreadystatechange = () => {
            xhr_on(xhr, future_end, need_download);
        };
        if (need_download) {
            download_init(xhr);
        }
        try {
            if (need_upload && req.body) {
                upload(xhr, req.body);
            } else {
                xhr.send();
            }
        } catch (err) {
            delete xhr.onreadystatechange;
            future_end.end(Err(err));
        }
    }).abort(() => {
        if (xhr) {
            xhr.abort();
        }
    });

    return future;
}

interface XHRAPI {
    upload(xhr: XMLHttpRequest, buf: Buffer): void;
    download_init(xhr: XMLHttpRequest): void;
    download_done(xhr: XMLHttpRequest): Buffer;
}

const {upload, download_init, download_done} = xhrapi_new();

interface MozXMLHttpRequest {
    sendAsBinary(data: any): void;
}

function xhrapi_new(): XHRAPI {
    var xhr = new XMLHttpRequest();
    xhr.open('get', '/', true);
    var buf = Buffer.allocUnsafe(1);
    
    const upload = typeof (xhr as any as MozXMLHttpRequest).sendAsBinary == 'function' ? (xhr: XMLHttpRequest, buf: Buffer) => {
        // upload binary string using Mozilla-specific sendAsBinary method
        (xhr as any as MozXMLHttpRequest).sendAsBinary(buf.buffer);
    } : typeof Uint8Array == 'function' ? // upload array buffer using XHR send method
    (buf instanceof Uint8Array ? (xhr: XMLHttpRequest, buf: Buffer) => {
		    xhr.send(buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength ?
                 // If the buffer isn't a subarray, return the underlying ArrayBuffer
                 buf.buffer :
			           // Otherwise we need to get a proper copy
			           buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    } : (xhr: XMLHttpRequest, buf: Buffer) => {
        // This is the slow version that will work with any Buffer
		    // implementation (even in old browsers)
		    var arrayCopy = new Uint8Array(buf.length);
		    var len = buf.length;
		    for (var i = 0; i < len; i++) {
			      arrayCopy[i] = buf[i];
		    }
		    xhr.send(arrayCopy.buffer);
    }) : (xhr: XMLHttpRequest, buf: Buffer) => {
        // upload as binary DOMString (fallback)
        xhr.send(buf.toString('binary'));
    };

    const [download_init, download_done] = (xhr => {
        if ('responseType' in xhr) {
            try {
                xhr.responseType = 'arraybuffer';
                // download array buffer using XHR responseType field
                return 'response' in xhr && xhr.responseType == 'arraybuffer';
            } catch (error) {}
        }
        return false;
    })(xhr) ? [(xhr: XMLHttpRequest) => {
        xhr.responseType = 'arraybuffer';
    }, (xhr: XMLHttpRequest) => {
        return Buffer.from(xhr.response as ArrayBuffer);
    }] : typeof xhr.overrideMimeType == 'function' ? [(xhr: XMLHttpRequest) => {
        // download binary string through overriding mime type
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
    }, (xhr: XMLHttpRequest) => {
        return Buffer.from(xhr.responseText, 'binary');
    }] : [(xhr: XMLHttpRequest) => {
        // download binary string as DOMString
    }, (xhr: XMLHttpRequest) => {
        return Buffer.from(xhr.responseText, 'binary');
    }];
    
    return {
        upload,
        download_init,
        download_done,
    };
}
