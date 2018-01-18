import { deepEqual } from 'assert';
import { Sink, Stream, channel, iter_arr, empty, once, repeat, unfold } from '../src/stream';
import { ok, err } from '../src/future';
import { Ok, Err } from '../src/result';
import { Some, None } from '../src/option';

function equalSets(a: number[], b: number[]) {
    const aq: { [key: number]: true } = {};
    const bq: { [key: number]: true } = {};
    for (let i = 0; i < a.length; i++) aq[a[i]] = true;
    for (let i = 0; i < b.length; i++) bq[b[i]] = true;
    deepEqual(aq, bq);
}

describe('stream', () => {
    let a: Stream<number, string>;
    let ea: Sink<number, string>;
    let b: Stream<number, string>;
    let eb: Sink<number, string>;
    let c: Stream<boolean, number>;
    let ec: Sink<boolean, number>;
    let d: Stream<string, string>;
    let ed: Sink<string, string>;

    beforeEach(() => {
        ([ea, a] = channel());
        ([eb, b] = channel());
        ([ec, c] = channel());
        ([ed, d] = channel());
    });

    it('ctor', () => {
        deepEqual([ea, a], channel());
        deepEqual([ec, c], channel());
    });

    describe('transfer', () => {
        describe('no values', () => {
            it('case 1', done => {
                a.end(res => {
                    deepEqual(res, Ok(None()));
                    done();
                }).start();
            });

            it('case 2', done => {
                eb.start(() => {
                    eb.done();
                });

                b.end(res => {
                    deepEqual(res, Ok(None()));
                    done();
                }).start();
            });
        });

        it('one value', done => {
            ea.start(() => {
                ea.send(123);
                ea.start(() => {
                    ea.done();
                });
            });

            a.end(res => {
                deepEqual(res, Ok(Some(123)));
                a.end(res => {
                    deepEqual(res, Ok(None()));
                    done();
                }).start();
            }).start();
        });

        it('two values', done => {
            ea.start(() => {
                ea.send(123);
                ea.start(() => {
                    ea.send(456);
                    ea.start(() => {
                        ea.done();
                    });
                });
            });

            a.end(res => {
                deepEqual(res, Ok(Some(123)));
                a.end(res => {
                    deepEqual(res, Ok(Some(456)));
                    a.end(res => {
                        deepEqual(res, Ok(None()));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('three values', done => {
            ea.start(() => {
                ea.send(123);
                ea.start(() => {
                    ea.send(456);
                    ea.start(() => {
                        ea.send(789);
                        ea.start(() => {
                            ea.done();
                        });
                    });
                });
            });

            a.end(res => {
                deepEqual(res, Ok(Some(123)));
                a.end(res => {
                    deepEqual(res, Ok(Some(456)));
                    a.end(res => {
                        deepEqual(res, Ok(Some(789)));
                        a.end(res => {
                            deepEqual(res, Ok(None()));
                            done();
                        }).start();
                    }).start();
                }).start();
            }).start();
        });
    });

    describe('stream', () => {
        it('map', done => {
            ea.start(() => {
                ea.send(-10);
                ea.start(() => {
                    ea.send(+10);
                    ea.start(() => {
                        ea.done();
                    });
                });
            });

            const pa = a.map<boolean>(val => val > 0);
            pa.end(res => {
                deepEqual(res, Ok(Some(false)));
                pa.end(res => {
                    deepEqual(res, Ok(Some(true)));
                    pa.end(res => {
                        deepEqual(res, Ok(None()));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('map_err', done => {
            ea.start(() => {
                ea.send(10);
                ea.start(() => {
                    ea.fail("unexpected");
                });
            });

            const pa = a.map_err(err => `Error: ${err}`);
            pa.end(res => {
                deepEqual(res, Ok(Some(10)));
                pa.end(res => {
                    deepEqual(res, Err("Error: unexpected"));
                    done();
                }).start();
            }).start();
        });

        it('filter_map', done => {
            let x = iter_arr([12, 0, -1, 2, -10, 0]);
            let y = x.filter_map(val => val > 0 ? Some(`${val} > 0`) : None());

            y.end(res => {
                deepEqual(res, Ok(Some("12 > 0")));
                y.end(res => {
                    deepEqual(res, Ok(Some("2 > 0")));
                    y.end(res => {
                        deepEqual(res, Ok(None()));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('filter', done => {
            let x = iter_arr([0, 12, -1, 0, 2, -10]);
            let y = x.filter(val => val < 0);

            y.end(res => {
                deepEqual(res, Ok(Some(-1)));
                y.end(res => {
                    deepEqual(res, Ok(Some(-10)));
                    y.end(res => {
                        deepEqual(res, Ok(None()));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('then', done => {
            let x = iter_arr([0, 12, -1, 0, 2, 3]);
            let y = x.then(res =>
                res.map_or_else(error => err("unexpected"), value =>
                    value % 2 == 0 ? ok(value) : err(`${value} % 2 != 0`)));

            y.end(res => {
                deepEqual(res, Ok(Some(0)));
                y.end(res => {
                    deepEqual(res, Ok(Some(12)));
                    y.end(res => {
                        deepEqual(res, Err("-1 % 2 != 0"));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('and_then', done => {
            let x = iter_arr([0, 12, -1, 0, 2, 3]).map_err(() => "unexpected");
            let y = x.and_then(value =>
                value % 2 == 0 ? ok(value) : err(`${value} % 2 != 0`));

            y.end(res => {
                deepEqual(res, Ok(Some(0)));
                y.end(res => {
                    deepEqual(res, Ok(Some(12)));
                    y.end(res => {
                        deepEqual(res, Err("-1 % 2 != 0"));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('or_else', done => {
            let x = iter_arr([0, 12, -1, 0, 2, 3]).map_err(() => "unexpected");
            let y = x.and_then(value =>
                value % 2 == 0 ? ok(value) : err(`${value} % 2 != 0`)
            ).or_else(error => ok(-123));

            y.end(res => {
                deepEqual(res, Ok(Some(0)));
                y.end(res => {
                    deepEqual(res, Ok(Some(12)));
                    y.end(res => {
                        deepEqual(res, Ok(Some(-123)));
                        y.end(res => {
                            deepEqual(res, Ok(Some(0)));
                            done();
                        }).start();
                    }).start();
                }).start();
            }).start();
        });

        it('fold', done => {
            iter_arr([0, 12, -7, 5, 2]).fold(-1, (a, b) => ok(a + b)).end(res => {
                deepEqual(res, Ok(11));
                done();
            }).start();
        });

        it('collect', done => {
            iter_arr([0, 12, -7, 5, 2]).collect().end(res => {
                deepEqual(res, Ok([0, 12, -7, 5, 2]));
                done();
            }).start();
        });

        describe('skip', () => {
            const list = [0, 12, -7, 5, 2];

            it('case 0', done => {
                iter_arr(list).skip(0).collect().end(res => {
                    deepEqual(res, Ok(list));
                    done();
                }).start();
            });

            it('case 1', done => {
                iter_arr(list).skip(1).collect().end(res => {
                    deepEqual(res, Ok(list.slice(1)));
                    done();
                }).start();
            });

            it('case 3', done => {
                iter_arr(list).skip(3).collect().end(res => {
                    deepEqual(res, Ok(list.slice(3)));
                    done();
                }).start();
            });

            it('case 5', done => {
                iter_arr(list).skip(5).collect().end(res => {
                    deepEqual(res, Ok([]));
                    done();
                }).start();
            });

            it('case 6', done => {
                iter_arr(list).skip(6).collect().end(res => {
                    deepEqual(res, Ok([]));
                    done();
                }).start();
            });
        });

        describe('take', () => {
            const list = [0, 12, -7, 5, 2];

            it('case 0', done => {
                iter_arr(list).take(0).collect().end(res => {
                    deepEqual(res, Ok([]));
                    done();
                }).start();
            });

            it('case 1', done => {
                iter_arr(list).take(1).collect().end(res => {
                    deepEqual(res, Ok(list.slice(0, 1)));
                    done();
                }).start();
            });

            it('case 3', done => {
                iter_arr(list).take(3).collect().end(res => {
                    deepEqual(res, Ok(list.slice(0, 3)));
                    done();
                }).start();
            });

            it('case 5', done => {
                iter_arr(list).take(5).collect().end(res => {
                    deepEqual(res, Ok(list));
                    done();
                }).start();
            });

            it('case 6', done => {
                iter_arr(list).take(6).collect().end(res => {
                    deepEqual(res, Ok(list));
                    done();
                }).start();
            });

            it('case ok >=0', done => {
                iter_arr<number, string>(list).and_then(item => item >= 0 ? ok(item) : err("value must be positive")).take(2).collect().end(res => {
                    deepEqual(res, Ok(list.slice(0, 2)));
                    done();
                }).start();
            });

            it('case err <0', done => {
                iter_arr<number, string>(list).and_then(item => item >= 0 ? ok(item) : err("value must be positive")).take(3).collect().end(res => {
                    deepEqual(res, Err("value must be positive"));
                    done();
                }).start();
            });
        });

        describe('forward', () => {
            it('case 1', done => {
                const [sink, stream] = channel<number, void>();

                const x = stream.collect().end(res => {
                    deepEqual(res, Ok([1, 2, 3, 4, 5]));
                });

                iter_arr<number, void>([1, 2, 3, 4, 5]).forward(sink).end(res => {
                    done();
                }).start();

                x.start();
            });

            it('case 2', done => {
                const [sink, stream] = channel<number, void>();

                const x = stream.collect().end(res => {
                    deepEqual(res, Ok([1, 2, 3, 4, 5]));
                });

                const y = iter_arr<number, void>([1, 2, 3, 4, 5]).forward(sink).end(res => {
                    done();
                });

                x.start();
                y.start();
            });
        });

        it('future', done => {
            iter_arr([1, 2, 3]).future().end(res => {
                const [item, stream] = res.unwrap();
                deepEqual(item, Some(1));
                stream.future().end(res => {
                    const [item, stream] = res.unwrap();
                    deepEqual(item, Some(2));
                    stream.future().end(res => {
                        const [item, stream] = res.unwrap();
                        deepEqual(item, Some(3));
                        stream.future().end(res => {
                            const [item] = res.unwrap();
                            deepEqual(item, None());
                            done();
                        }).start();
                    }).start();
                }).start();
            }).start();
        });

        it('chunks', done => {
            iter_arr([1, 2, 5, 3, -4, 0, 9, 1, 0, -2]).chunks(3).collect().end(res => {
                deepEqual(res, Ok([[1, 2, 5], [3, -4, 0], [9, 1, 0], [-2]]));
                done();
            }).start();
        });

        describe('select', () => {
            it('case ok iter', done => {
                const x = iter_arr([1, 2, 3]).select(iter_arr([6, 5]));

                x.end(res => {
                    deepEqual(res, Ok(Some(1)));
                    x.end(res => {
                        deepEqual(res, Ok(Some(6)));
                        x.end(res => {
                            deepEqual(res, Ok(Some(2)));
                            x.end(res => {
                                deepEqual(res, Ok(Some(5)));
                                x.end(res => {
                                    deepEqual(res, Ok(Some(3)));
                                    x.end(res => {
                                        deepEqual(res, Ok(None()));
                                        done();
                                    }).start();
                                }).start();
                            }).start();
                        }).start();
                    }).start();
                }).start();
            });

            it('case err iter', done => {
                const x = iter_arr([1, 2, 3, 4]).and_then(item => item < 3 ? ok(item) : err("unexpected")).select(iter_arr([6, 5]));

                x.end(res => {
                    deepEqual(res, Ok(Some(6)));
                    x.end(res => {
                        deepEqual(res, Ok(Some(1)));
                        x.end(res => {
                            deepEqual(res, Ok(Some(5)));
                            x.end(res => {
                                deepEqual(res, Ok(Some(2)));
                                x.end(res => {
                                    deepEqual(res, Err("unexpected"));
                                    done();
                                }).start();
                            }).start();
                        }).start();
                    }).start();
                }).start();
            });

            it('case ok iter collect', done => {
                iter_arr([1, 2, 3, 4]).select(iter_arr([6, 5])).collect().end(res => {
                    equalSets(res.unwrap(), [1, 6, 2, 5, 3, 4]);
                    done();
                }).start();
            });

            it('case err iter collect', done => {
                iter_arr([1, 2, 3, 4]).and_then(item => item < 3 ? ok(item) : err("unexpected")).select(iter_arr([6, 5])).collect().end(res => {
                    deepEqual(res, Err("unexpected"));
                    done();
                }).start();
            });

            it('case ok defer', done => {
                ea.start(() => {
                    setTimeout(() => {
                        ea.start(() => {
                            ea.stop().send(5);
                        }).send(1);
                    }, 15);
                });

                eb.start(() => {
                    eb.start(() => {
                        setTimeout(() => {
                            eb.start(() => {
                                eb.done();
                            }).send(4);
                        }, 20);
                    }).send(2);
                });

                a.select(b).collect().end(res => {
                    deepEqual(res, Ok([2, 1, 5, 4]));
                    done();
                }).start();
            });

            it('case err defer', done => {
                ea.start(() => {
                    setTimeout(() => {
                        ea.start(() => {
                            ea.fail("unexpected");
                        }).send(1);
                    }, 15);
                });

                eb.start(() => {
                    eb.start(() => {
                        setTimeout(() => {
                            eb.start(() => {
                                eb.done();
                            }).send(4);
                        }, 20);
                    }).send(2);
                });

                const x = a.select(b);

                x.end(res => {
                    deepEqual(res, Ok(Some(2)));
                    x.end(res => {
                        deepEqual(res, Ok(Some(1)));
                        x.end(res => {
                            deepEqual(res, Err("unexpected"));
                            done();
                        }).start();
                    }).start();
                }).start();
            });
        });

        it('empty', done => {
            empty().end(res => {
                deepEqual(res, Ok(None()));
                done();
            }).start();
        });

        it('once', done => {
            const x = once("some str");
            x.end(res => {
                deepEqual(res, Ok(Some("some str")));
                x.end(res => {
                    deepEqual(res, Ok(None()));
                    done();
                }).start();
            }).start();
        });

        it('repeat', done => {
            const x = repeat(true);

            x.end(res => {
                deepEqual(res, Ok(Some(true)));
                x.end(res => {
                    deepEqual(res, Ok(Some(true)));
                    x.end(res => {
                        deepEqual(res, Ok(Some(true)));
                        x.end(res => {
                            deepEqual(res, Ok(Some(true)));
                            x.end(res => {
                                deepEqual(res, Ok(Some(true)));
                                done();
                            }).start();
                        }).start();
                    }).start();
                }).start();
            }).start();
        });

        it('unfold', done => {
            const x = unfold<number, number, void>(-1, (i: number) => ok(i < 3 ? Some<[number, number]>([i, i + 1]) : None()));

            x.end(res => {
                deepEqual(res, Ok(Some(-1)));
                x.end(res => {
                    deepEqual(res, Ok(Some(0)));
                    x.end(res => {
                        deepEqual(res, Ok(Some(1)));
                        x.end(res => {
                            deepEqual(res, Ok(Some(2)));
                            x.end(res => {
                                deepEqual(res, Ok(None()));
                                done();
                            }).start();
                        }).start();
                    }).start();
                }).start();
            }).start();
        });
    });

    describe('sink', () => {
        it('map', done => {
            const xa = ea.map<boolean>(val => val ? +10 : -10);

            xa.start(() => {
                xa.send(true);
                xa.start(() => {
                    xa.send(false);
                    xa.start(() => {
                        xa.done();
                    });
                });
            });

            a.end(res => {
                deepEqual(res, Ok(Some(10)));
                a.end(res => {
                    deepEqual(res, Ok(Some(-10)));
                    a.end(res => {
                        deepEqual(res, Ok(None()));
                        done();
                    }).start();
                }).start();
            }).start();
        });

        it('map_err', done => {
            const xa = ea.map_err(err => `${err}!!!`);

            xa.start(() => {
                xa.send(1);
                xa.start(() => {
                    xa.fail("Unexpected eof");
                });
            });

            a.end(res => {
                deepEqual(res, Ok(Some(1)));
                a.end(res => {
                    deepEqual(res, Err("Unexpected eof!!!"));
                    done();
                }).start();
            }).start();
        });

        describe('with', () => {
            it('case ok', done => {
                const xa = ea.with<number>(item => ok(item * 2));

                let i = 0;
                xa.start(() => { if (i < 2) xa.send(i++); else xa.done(); });

                a.end(res => {
                    deepEqual(res, Ok(Some(0)));
                    a.end(res => {
                        deepEqual(res, Ok(Some(2)));
                        a.end(res => {
                            deepEqual(res, Ok(None()));
                            done();
                        }).start();
                    }).start();
                }).start();
            });

            it('case err', done => {
                const xa = ea.with<number>(item => item < 2 ? ok(item * 2) : err("item must be less than two"));

                let i = 0;
                xa.start(() => { xa.send(i++); });

                a.end(res => {
                    deepEqual(res, Ok(Some(0)));
                    a.end(res => {
                        deepEqual(res, Ok(Some(2)));
                        a.end(res => {
                            deepEqual(res, Err("item must be less than two"));
                            done();
                        }).start();
                    }).start();
                }).start();
            });
        });

        describe('with_flat_map', () => {
            it('case ok 8 (i-1, i, i+1)', done => {
                const xa = ea.with_flat_map<number>(item => iter_arr([item - 1, item, item + 1]));

                let i = 1;
                xa.start(() => { xa.send(i++); });

                a.take(8).collect().end(res => {
                    deepEqual(res, Ok([0, 1, 2, 1, 2, 3, 2, 3]));
                    done();
                }).start();
            });

            it('case ok <3', done => {
                const xa = ea.with_flat_map<number>(item => iter_arr<number, string>([item - 1, item, item + 1]).and_then(item => item < 3 ? ok(item) : err("item must be less than 3")));

                let i = 1;
                xa.start(() => { xa.send(i++); });

                a.take(5).collect().end(res => {
                    deepEqual(res, Ok([0, 1, 2, 1, 2]));
                    done();
                }).start();
            });

            it('case err >=3', done => {
                const xa = ea.with_flat_map<number>(item => iter_arr<number, string>([item - 1, item, item + 1]).and_then(item => item < 3 ? ok(item) : err("item must be less than 3")));

                let i = 1;
                xa.start(() => { xa.send(i++); });

                a.take(8).collect().end(res => {
                    deepEqual(res, Err("item must be less than 3"));
                    done();
                }).start();
            });
        });
    });
});
