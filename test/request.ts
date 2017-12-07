import { equal, deepEqual } from 'assert';
import { Method, request, SuccessCode, SuccessStatus, ClientError, ClientCode, ServerError, ServerCode } from '../request';

describe('request', () => {
    it('get ascii', (done) => {
        request({ method: Method.Get, url: '/xhr/ascii' })
            .end(res => {
                equal(res.is_ok, true);
                const {status, headers, body} = res.unwrap();
                deepEqual(status, new SuccessStatus(SuccessCode.Ok, 'OK'));
                equal(headers['Content-Type'], 'text/plain');
                deepEqual(body, Buffer.from("Not very long ASCII text content.", 'ascii'));
                done();
            }).start();
    });

    it('get utf8', (done) => {
        request({ method: Method.Get, url: '/xhr/utf8' })
            .end(res => {
                equal(res.is_ok, true);
                const {status, headers, body} = res.unwrap();
                deepEqual(status, new SuccessStatus(SuccessCode.Ok, 'OK'));
                equal(headers['Content-Type'], 'text/plain; charset=utf8');
                deepEqual(body, Buffer.from("Не очень длинное UTF-8 содержимое.", 'utf8'));
                done();
            }).start();
    });

    it('get binary', (done) => {
        request({ method: Method.Get, url: '/xhr/binary' })
            .end(res => {
                equal(res.is_ok, true);
                const {status, headers, body} = res.unwrap();
                deepEqual(status, new SuccessStatus(SuccessCode.Ok, 'OK'));
                equal(headers['Content-Type'], 'application/octet-stream');
                deepEqual(body, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]));
                done();
            }).start();
    });

    it('get client error', (done) => {
        request({ method: Method.Get, url: '/xhr/error' })
            .end(res => {
                equal(res.is_err, true);
                const error = res.unwrap_err();
                deepEqual(error, new ClientError(ClientCode.Forbidden, 'Forbidden'));
                done();
            }).start();
    });

    it('put ascii', (done) => {
        request({ method: Method.Put, url: '/xhr/ascii', headers: {'Content-Type': 'text/plain'}, body: Buffer.from("Not very long ASCII text content.", 'ascii') })
            .end(res => {
                equal(res.is_ok, true);
                const {status} = res.unwrap();
                deepEqual(status, new SuccessStatus(SuccessCode.Ok, 'OK'));
                done();
            }).start();
    });

    it('put ascii error', (done) => {
        request({ method: Method.Put, url: '/xhr/ascii', headers: {'Content-Type': 'text/plain'}, body: Buffer.from("Not very long ASCII text content!", 'ascii') })
            .end(res => {
                equal(res.is_ok, false);
                const error = res.unwrap_err();
                deepEqual(error, new ClientError(ClientCode.BadRequest, 'Invalid'));
                done();
            }).start();
    });

    it('put utf8', (done) => {
        request({ method: Method.Put, url: '/xhr/utf8', headers: {'Content-Type': 'text/plain; charset=utf8'}, body: Buffer.from("Не очень длинное UTF-8 содержимое.", 'utf8') })
            .end(res => {
                equal(res.is_ok, true);
                const {status} = res.unwrap();
                deepEqual(status, new SuccessStatus(SuccessCode.Ok, 'OK'));
                done();
            }).start();
    });
    
    it('put utf8 error', (done) => {
        request({ method: Method.Put, url: '/xhr/utf8', headers: {'Content-Type': 'text/plain; charset=utf8'}, body: Buffer.from("Не очень длинное UTF-8 содержимое!", 'utf8') })
            .end(res => {
                equal(res.is_ok, false);
                const error = res.unwrap_err();
                deepEqual(error, new ClientError(ClientCode.BadRequest, 'Invalid'));
                done();
            }).start();
    });

    it('put binary', (done) => {
        request({ method: Method.Put, url: '/xhr/binary', headers: {'Content-Type': 'application/octet-stream'}, body: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]) })
            .end(res => {
                equal(res.is_ok, true);
                const {status} = res.unwrap();
                deepEqual(status, new SuccessStatus(SuccessCode.Ok, 'OK'));
                done();
            }).start();
    });

    it('put binary error', (done) => {
        request({ method: Method.Put, url: '/xhr/utf8', headers: {'Content-Type': 'application/octet-stream'}, body: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]) })
            .end(res => {
                equal(res.is_ok, false);
                const error = res.unwrap_err();
                deepEqual(error, new ClientError(ClientCode.BadRequest, 'Invalid'));
                done();
            }).start();
    });

    it('put server error', (done) => {
        request({ method: Method.Put, url: '/xhr/error' })
            .end(res => {
                equal(res.is_err, true);
                const error = res.unwrap_err();
                deepEqual(error, new ServerError(ServerCode.BadGateway, 'Bad gateway'));
                done();
            }).start();
    });
});
