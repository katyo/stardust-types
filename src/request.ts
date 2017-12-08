import { Ok, Err } from './result';
import { Future, Async } from './future';
import { Method, Headers, ReqFn, AbrFn } from './request/backend';
import { request as browser_request } from './request/browser';
//import { request as node_request } from './request/node';

export { Method, Headers };

//const request_backend: ReqFn = typeof window != 'undefined' ? browser_request : node_request;
const request_backend: ReqFn = typeof window != 'undefined' ? browser_request : require('./request/node').request;

function uploadable(method: Method): boolean {
    return method == Method.Post || method == Method.Put || method == Method.Patch;
}

function downloadable(method: Method): boolean {
    return method != Method.Head && method != Method.Delete && method != Method.Options;
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

export type ResponseStatus = InfoStatus | SuccessStatus | RedirectStatus | ClientError | ServerError;

export type ResponseError = Error;

export function request(req: Request): Future<Response, ResponseError> {
    const [future_end, future] = Async<Response, ResponseError>();

    let abort: AbrFn;
    
    future_end.start(() => {
        abort = request_backend(req.method, req.url, req.headers || {}, uploadable(req.method) ? req.body : undefined, downloadable(req.method), (code: number, message: string, headers: Headers, body?: Buffer) => {
            const status: ResponseStatus =
                code < 200 ? new InfoStatus(code, message) :
                code < 300 ? new SuccessStatus(code, message) :
                code < 400 ? new RedirectStatus(code, message) :
                code < 500 ? new ClientError(code, message) :
                new ServerError(code, message);
            const res: Response = { status, headers };
            if (body) {
                res.body = body;
            }
            future_end.end(Ok(res));
        }, (error: Error) => {
            future_end.end(Err(error));
        });
    }).abort(() => { abort(); });

    return future;
}
