import express from 'express';
const app = express();
const port = 3000;
import path from 'path';
const __dirname = path.resolve();
import bodyParser from 'body-parser';
import session from 'express-session';
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
import methodOverride from 'method-override';
app.use(methodOverride('_method'));

import dotenv from 'dotenv';
dotenv.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 14 * 1000,
    },
    // store: new FileStore() /* 활성화 할경우 세션이 저장되기 전에 flash가 먼저 실행됨 */
  })
);

import MongoClient from 'mongodb';
const Mongo = MongoClient.MongoClient;
const ObjId = MongoClient.ObjectId;

var db;
Mongo.connect(process.env.DB_URL)
  .then((client) => {
    db = client.db(process.env.DB_NAME);
  })
  .catch((err) => {
    console.log(err);
  });

import passport from 'passport';
import Google from 'passport-google-oauth';
import { logincheck1, logincheck2, managercheck } from './lib/logincheck.js';
const GoogleStrategy = Google.OAuth2Strategy;

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.collection('login')
    .findOne({ id: id })
    .then((user) => {
      done(null, user);
    });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URIS,
    },
    function (accessToken, refreshToken, profile, done) {
      // console.log(profile);
      db.collection('login')
        .findOne({ email: profile._json.email })
        .then(async (user) => {
          if (!user) {
            var newuser = {
              id: profile._json.sub,
              email: profile._json.email,
              nickname: profile._json.name,
              locale: profile._json.locale,
              Date: new Date().valueOf(),
            };
            await db
              .collection('login')
              .insertOne(newuser)
              .then(async (result1) => {
                await db.createCollection('user' + result1.insertedId.toString());
                var routine = [
                  {
                    title: '3분할',
                    division: ['가슴', '등', '하체'],
                    list: ['바벨 플랫 벤치 프레스', '핀 로드 랫 풀 다운', '바벨 스쿼트'],
                  },
                  {
                    title: '2분할',
                    division: ['상체', '하체'],
                    list: ['바벨 플랫 벤치 프레스', '바벨 스쿼트'],
                  },
                  {
                    title: '5분할',
                    division: ['가슴', '등', '하체전면', '하체후면', '어깨'],
                    list: [
                      '바벨 플랫 벤치 프레스',
                      '핀 로드 랫 풀 다운',
                      '레그 익스텐션',
                      '시티드 레그 컬',
                      '덤벨 사이드 레터럴 레이즈',
                    ],
                  },
                  {
                    title: '무분할',
                    division: ['전신'],
                    list: ['바벨 스쿼트'],
                  },
                ];
                var routine_data = [];
                for (var i = 0; i < routine.length; i++) {
                  routine_data.push({
                    name: 'routine',
                    title: routine[i].title,
                    date: new Date().valueOf(),
                  });
                }
                await db
                  .collection('user' + result1.insertedId.toString())
                  .insertMany(routine_data)
                  .then(async (result2) => {
                    for (var a = 0; a < result2.insertedCount; a++) {
                      var division_data = [];
                      for (var b = 0; b < routine[a].division.length; b++) {
                        division_data.push({
                          id: result2.insertedIds[a],
                          title: routine[a].division[b],
                          date: new Date().valueOf(),
                        });
                      }
                      await db
                        .collection('user' + result1.insertedId.toString())
                        .insertMany(division_data)
                        .then(async (result3) => {
                          for (var c = 0; c < result3.insertedCount; c++) {
                            await db
                              .collection('list')
                              .findOne({ title: routine[a].list[c] })
                              .then(async (result4) => {
                                await db.collection('user' + result1.insertedId.toString()).insertOne({
                                  list_id: result4._id,
                                  id: result3.insertedIds[c],
                                  title: result4.title,
                                  division: result4.division,
                                });
                                await db.collection('user' + result1.insertedId.toString()).insertOne({
                                  memo: result4._id.toString(),
                                  contents: [
                                    { title: '랙or의자', content: '번호' },
                                    { title: '안전바or핀', content: '번호' },
                                  ],
                                });
                              });
                          }
                        });
                    }
                  });
              });
            return done(null, newuser);
          } else {
            return done(null, user);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  )
);

app.get('/auth/logout', function (req, res) {
  req.logout((err) => {
    res.redirect('/auth/login');
  });
});

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/login',
  }),
  (req, res) => {
    res.redirect('/routine');
  }
);

app.get('/device', function (req, res) {
  const ua = req.headers['user-agent'].toLowerCase();
  const isKakao = ua.indexOf('kakao') > -1;
  const isAndroid = ua.indexOf('android') > -1;
  const isIos = ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1;

  if (isKakao) {
    // console.log('kakao');
    if (isAndroid) {
      res.send('android');
    } else if (isIos) {
      res.send('ios');
    }
  } else {
    // console.log('else');
    // Android/iOS 이외의 기기인 경우, 일반적인 브라우저에서 열리도록 함
    res.send('else');
  }
});

app.post('/update_routine', logincheck2, function (req, res) {
  // console.log(req.body);
  db.collection('user' + req.user._id.toString())
    .updateOne({ _id: new ObjId(req.body._id) }, { $set: { title: req.body.title } })
    .then((result) => {
      res.send(result.acknowledged);
    });
});
app.post('/update_division', logincheck2, function (req, res) {
  // console.log(req.body);
  db.collection('user' + req.user._id.toString())
    .updateOne({ _id: new ObjId(req.body._id) }, { $set: { title: req.body.title } })
    .then((result) => {
      res.send(result.acknowledged);
    });
});
app.post('/update_memo', logincheck2, function (req, res) {
  // console.log(req.body);
  db.collection('user' + req.user._id.toString())
    .updateOne({ memo: req.body.memo }, { $set: { contents: req.body.contents } })
    .then((result) => {
      // console.log(result);
      res.send(result.acknowledged);
    });
});

app.post('/add_routine', logincheck2, function (req, res) {
  // console.log(req.body)
  var data = {
    name: 'routine',
    title: req.body.title,
    date: new Date().valueOf(),
  };
  db.collection('user' + req.user._id.toString())
    .insertOne(data)
    .then((result) => {
      // console.log(result.insertedId)
      res.send(Object.assign(data, result.insertedId));
    });
});

app.post('/add_division', logincheck2, function (req, res) {
  // console.log(req.body)
  var data = {
    id: new ObjId(req.body.id),
    title: req.body.title,
    date: new Date().valueOf(),
  };
  db.collection('user' + req.user._id.toString())
    .insertOne(data)
    .then((result) => {
      // console.log(result.insertedId)
      res.send(result.insertedId);
    });
});

app.post('/add_mylist', logincheck2, async function (req, res) {
  var exrecord = [];
  var record = [];
  var memo = [];
  var basic_record = [
    { kg: '', rep: '', break_time: 60, performance_time: '', check: true },
    { kg: '', rep: '', break_time: 60, performance_time: '', check: true },
    { kg: '', rep: '', break_time: 60, performance_time: '', check: true },
  ];
  for (var i = 0; i < req.body.select.length; i++) {
    await db
      .collection('user' + req.user._id.toString())
      .insertOne({
        list_id: new ObjId(req.body.select[i]._id),
        id: new ObjId(req.body.id),
        title: req.body.select[i].title,
        division: req.body.select[i].division,
      })
      .then(async (result1) => {
        await db
          .collection('user' + req.user._id.toString())
          .findOne({ _id: result1.insertedId })
          .then(async (result2) => {
            await db
              .collection('user' + req.user._id.toString())
              .find({ name: result2.list_id.toString() })
              .sort({ date: -1 })
              .toArray()
              .then((result3) => {
                if (result3[0]) {
                  return;
                } else {
                  record.push({
                    name: result2.list_id.toString(),
                    record: basic_record,
                    title: req.body.select[i].title,
                    date: new Date().valueOf(),
                  });
                  exrecord.push({
                    name: result2.list_id.toString(),
                    record: basic_record,
                    title: req.body.select[i].title,
                    date: new Date().valueOf(),
                  });
                }
              });
            await db
              .collection('user' + req.user._id.toString())
              .findOne({ memo: result2.list_id.toString() })
              .then(async (result3) => {
                if (result3) {
                  return;
                } else {
                  await db
                    .collection('user' + req.user._id.toString())
                    .insertOne({
                      memo: result2.list_id.toString(),
                      contents: [
                        { title: '랙or의자', content: '번호' },
                        { title: '안전바or핀', content: '번호' },
                      ],
                    })
                    .then((result4) => {
                      memo.push({
                        _id: result4.insertedId,
                        memo: result2.list_id.toString(),
                        contents: [
                          { title: '랙or의자', content: '번호' },
                          { title: '안전바or핀', content: '번호' },
                        ],
                      });
                    });
                }
              });
          });
      });
  }
  await db
    .collection('user' + req.user._id.toString())
    .find({ id: new ObjId(req.body.id) })
    .toArray()
    .then(async (result) => {
      res.send({ mylist: result, record: record, exrecord: exrecord, memo: memo });
    });
});

app.post('/add_record', logincheck2, async function (req, res) {
  var record = req.body.record;
  var date = new Date().valueOf();
  for (var i = record.length - 1; i >= 0; i--) {
    for (var j = record[i].record.length - 1; j >= 0; j--) {
      if (record[i].record[j].check == false) {
        record[i].record.splice(j, 1);
      }
    }
  }
  var data = [];
  for (var k = 0; k < record.length; k++) {
    if (record[k].record[0]) {
      data.push(record[k]);
    }
  }
  for (var l = 0; l < data.length; l++) {
    delete data[l]._id;
    data[l].date = date;
  }
  db.collection('user' + req.user._id.toString())
    .updateOne({ _id: new ObjId(req.body.mylist_name) }, { $set: { date: date } })
    .then(() => {
      db.collection('user' + req.user._id.toString())
        .findOne({ _id: new ObjId(req.body.mylist_name) })
        .then((result) => {
          db.collection('user' + req.user._id.toString())
            .updateOne({ _id: result.id }, { $set: { date: date } })
            .then(() => {
              db.collection('user' + req.user._id.toString())
                .insertMany(data)
                .then((result) => {
                  res.send(result);
                });
            });
        });
    });
});

app.delete('/del_routine', logincheck2, function (req, res) {
  var ObjectId = new ObjId(req.query._id);
  db.collection('user' + req.user._id.toString())
    .find({ id: ObjectId })
    .toArray()
    .then((result1) => {
      for (var i = 0; i < result1.length; i++) {
        db.collection('user' + req.user._id.toString()).deleteMany({ id: result1[i]._id });
      }
      db.collection('user' + req.user._id.toString())
        .deleteMany({ id: ObjectId })
        .then(() => {
          db.collection('user' + req.user._id.toString())
            .deleteOne({ _id: ObjectId })
            .then((result2) => {
              res.send(result2);
            });
        });
    });
});

app.delete('/del_division', logincheck2, function (req, res) {
  var ObjectId = new ObjId(req.query._id);
  db.collection('user' + req.user._id.toString())
    .deleteOne({ _id: ObjectId })
    .then((result) => {
      db.collection('user' + req.user._id.toString())
        .deleteMany({ id: ObjectId })
        .then(() => {
          res.send(result);
        });
    });
});

app.delete('/del_mylist', logincheck2, function (req, res) {
  var ObjectId = new ObjId(req.query._id);
  db.collection('user' + req.user._id.toString())
    .deleteOne({ _id: ObjectId })
    .then((result) => {
      if (result.deletedCount == 1) {
        res.send(result);
      }
    });
});

app.get('/get_prev_record', logincheck2, function (req, res) {
  console.log(req.query);
  var record = [];
  var year = Number(req.query.year);
  var month = Number(req.query.month);
  var startDate = new Date(year, month - 1);
  var endDate = new Date(year, month);
  console.log(startDate.valueOf(), endDate.valueOf());
  db.collection('list')
    .find()
    .toArray()
    .then(async (result1) => {
      for (let i = 0; i < result1.length; i++) {
        await db
          .collection('user' + req.user._id.toString())
          .find({ name: result1[i]._id.toString(), date: { $gte: startDate.valueOf(), $lt: endDate.valueOf() } })
          .toArray()
          .then((result2) => {
            if (result2[0]) {
              record.push(...result2);
            }
          });
      }
      res.send(record);
    });
});

app.get('/get_next_record', logincheck2, function (req, res) {
  console.log(req.query);
  var record = [];
  var year = Number(req.query.year);
  var month = Number(req.query.month);
  var startDate = new Date(year, month - 1);
  var endDate = new Date(year, month);
  console.log(startDate.toString(), endDate.toString());
  db.collection('list')
    .find()
    .toArray()
    .then(async (result1) => {
      for (let i = 0; i < result1.length; i++) {
        await db
          .collection('user' + req.user._id.toString())
          .find({ name: result1[i]._id.toString(), date: { $gte: startDate.valueOf(), $lt: endDate.valueOf() } })
          .toArray()
          .then((result2) => {
            if (result2[0]) {
              record.push(...result2);
            }
          });
      }
      res.send(record);
    });
});

app.get('/setdata', logincheck2, function (req, res) {
  var division = [];
  var list = [];
  var mylist = [];
  var exrecord = [];
  var memo = [];
  var calendar = [];
  var basic_record = [
    { kg: '', rep: '', break_time: 60, performance_time: '', check: true },
    { kg: '', rep: '', break_time: 60, performance_time: '', check: true },
    { kg: '', rep: '', break_time: 60, performance_time: '', check: true },
  ];
  db.collection('user' + req.user._id.toString())
    .find({ name: 'routine' })
    .sort({ date: -1 })
    .toArray()
    .then(async (result1) => {
      for (var i = 0; i < result1.length; i++) {
        await db
          .collection('user' + req.user._id.toString())
          .find({ id: result1[i]._id })
          .sort({ date: 1 })
          .toArray()
          .then(async (result2) => {
            division.push(...result2);
            for (var a = 0; a < result2.length; a++) {
              await db
                .collection('user' + req.user._id.toString())
                .find({ id: result2[a]._id })
                .toArray()
                .then(async (result3) => {
                  var today = new Date();
                  var searchDate = '';
                  if (today.getMonth < 2) {
                    searchDate = new Date(today.getFullYear() - 1, today.getMonth() - 1 + 12);
                  } else {
                    searchDate = new Date(today.getFullYear(), today.getMonth() - 1);
                  }
                  mylist.push(...result3);
                  for (let b = 0; b < result3.length; b++) {
                    await db
                      .collection('user' + req.user._id.toString())
                      .find({ name: result3[b].list_id.toString() })
                      .sort({ date: -1 })
                      .toArray()
                      .then((result4) => {
                        if (result4[0]) {
                          exrecord.push(result4[0]);
                        } else {
                          exrecord.push({
                            name: result3[b].list_id.toString(),
                            record: basic_record,
                            title: result3[b].title,
                            date: null,
                          });
                        }
                      });
                    await db
                      .collection('user' + req.user._id.toString())
                      .findOne({ memo: result3[b].list_id.toString() })
                      .then(async (result4) => {
                        if (result4) {
                          memo.push(result4);
                        } else {
                          await db
                            .collection('user' + req.user._id.toString())
                            .insertOne({
                              memo: result3[b].list_id.toString(),
                              contents: [
                                { title: '랙or의자', content: '번호' },
                                { title: '안전바or핀', content: '번호' },
                              ],
                            })
                            .then((result5) => {
                              memo.push({
                                _id: result5.insertedId,
                                memo: result3[b].list_id.toString(),
                                contents: [
                                  { title: '랙or의자', content: '번호' },
                                  { title: '안전바or핀', content: '번호' },
                                ],
                              });
                            });
                        }
                      });
                    await db
                      .collection('user' + req.user._id.toString())
                      .find({ name: result3[b].list_id.toString(), date: { $gte: searchDate.valueOf() } })
                      .toArray()
                      .then((result4) => {
                        calendar.push(...result4);
                      });
                  }
                });
            }
          });
      }
      await db
        .collection('list')
        .find()
        .sort({ title: 1 })
        .toArray()
        .then(async (result1) => {
          list = result1;
        });

      const record = JSON.parse(JSON.stringify(exrecord));

      for (var i = 0; i < record.length; i++) {
        for (var a = 0; a < record[i].record.length; a++) {
          record[i].record[a].check = false;
          record[i].record[a].performance_time = '';
        }
      }

      res.send({
        routine: {
          routine: result1,
          division: division,
          list: list,
          mylist: mylist,
          exrecord: exrecord,
          record: record,
          memo: memo,
        },
        profile: { profile: req.user },
        calendar: { record: calendar },
      });
    });
});

app.get('/auth/login', logincheck1, function (req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});
app.get('/auth/signout', logincheck2, function (req, res) {
  db.collection('user' + req.user._id.toString())
    .drop()
    .then(() => {
      db.collection('login')
        .deleteOne({ email: req.user.email })
        .then(() => {
          res.redirect('/auth/logout');
        });
    });
});

app.get('/assetlinks.json', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/assetlinks.json'));
});
app.get('/sitemap.xml', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/sitemap.xml'));
});

app.get('/ads.txt', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/ads.txt'));
});

app.get('/privacypolicy', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/tosnpp/privacypolicy.html'));
});
app.get('/tos', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/tosnpp/tos.html'));
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});
app.get('*', logincheck2, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log('listening on 3000');
});
