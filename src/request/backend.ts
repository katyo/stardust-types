export const enum Method {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
    Delete = 'DELETE',
    Head = 'HEAD',
    Patch = 'PATCH',
    Options = 'OPTIONS',
}

export interface Headers {
    [name: string]: string;
}

export type ResFn = (status: number, message: string, headers: Headers, body?: Buffer) => void;
export type ErrFn = (error: Error) => void;
export type AbrFn = () => void;
export type ReqFn = (method: Method, url: string, headers: Headers, body: Buffer | undefined, need_body: boolean, res: ResFn, err: ErrFn) => AbrFn;
