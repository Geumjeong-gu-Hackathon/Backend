const express = require('express')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const { MongoClient, ObjectId } = require('mongodb')
const bodyParser = require('body-parser')

const app = express()

let db;
const url = 'mongodb+srv://2023060:happy1060!@cluster0.gowbchn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

new MongoClient(url).connect().then((client) => {
  console.log('DB 연결 성공');
  db = client.db('geumjeong');
}).catch((err) => {
  console.log(err);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 세션 설정
app.use(session({
  secret: '암호화에 쓸 비번',
  resave: false,
  saveUninitialized: false,
}));

// Passport 초기화 및 세션 설정
app.use(passport.initialize());
app.use(passport.session());

// 기본 라우트
app.get('/', async (req, res) => {
  try {
    const posts = await db.collection('posts').find().sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    console.error('게시물 조회 중 오류 발생:', error);
    res.status(500).json({ message: '게시물 조회 중 오류가 발생했습니다.' });
  }
});

// 로그인 페이지 라우트
/*pp.get('/login', (req, res) => {
  res.render('login'); // .ejs 확장자는 생략 가능
});

// 회원가입 페이지 라우트
app.get('/signup', (req, res) => {
  res.render('signup'); // .ejs 확장자는 생략 가능
});*/

// Passport LocalStrategy 설정
passport.use(new LocalStrategy(async (username, password, done) => {
  let result;
  try {
    result = await db.collection('user').findOne({ username: username });
  } catch (error) {
    return done(error);
  }

  if (!result) {
    return done(null, false, { message: '아이디 DB에 없음' });
  }

  if (result.password === password) {
    return done(null, result);
  } else {
    return done(null, false, { message: '비번불일치' });
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.collection('user').findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// 로그인 처리 라우트
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  })(req, res, next);
});

// 회원가입 처리 라우트
app.post('/signup', async (req, res) => {
  const { username, password, name, location } = req.body;

  try {
    const existingUser = await db.collection('user').findOne({ username: username });

    if (existingUser) {
      return res.status(400).send('이미 사용 중인 아이디입니다.');
    }

    const result = await db.collection('user').insertOne({ username: username, password: password, name: name, location: location});
    res.redirect('/login'); // 회원가입 후 로그인 페이지로 이동
  } catch (error) {
    console.log(error);
    res.status(500).send('회원가입 중 오류가 발생했습니다.');
  }
});

/*app.get('/post', (req,res) => {
    res.render('post')
})*/
/*
app.post('/post', async (req,res) => {
    const { title, content } = req.body;
    const existingUser = await db.collection('user').findOne({ username: username });
    const result = await db.collection('posts').insertOne({ username: existingUser.username, title: title, content: content});
})
*/
app.post('/post', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('로그인이 필요합니다.');
    }

    const { title, content } = req.body;
    const username = req.user.username;
    const name = req.user.name; // 인증된 사용자 정보 사용

    try {
        const result = await db.collection('posts').insertOne({ username: username, name: name, title: title, content: content, createdAt: new Date() });
        res.status(201).json({ message: '게시물이 성공적으로 생성되었습니다.', postId: result.insertedId });
    } catch (error) {
        console.error('게시물 생성 중 오류 발생:', error);
        res.status(500).send('게시물 생성 중 오류가 발생했습니다.');
    }
});

app.get('/search', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ message: '검색어를 입력해주세요.' });
    }

    try {
        // MongoDB에서 title과 content를 기준으로 검색
        const results = await db.collection('posts').find({
            $or: [
                { title: { $regex: query, $options: 'i' } }, // 대소문자 구분 없이 title에 query가 포함된 문서
                { content: { $regex: query, $options: 'i' } } // 대소문자 구분 없이 content에 query가 포함된 문서
            ]
        }).toArray();

        console.log(results);
        res.json(results); // 검색 결과를 클라이언트에게 전송
    } catch (error) {
        console.error('검색 중 오류 발생:', error);
        res.status(500).json({ message: '검색 중 오류가 발생했습니다.' });
    }
});



app.post('/like', async (req,res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('로그인이 필요합니다.');
    }

    const { postId, like } = req.body;
    
    
})

app.post('/comment', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('로그인이 필요합니다.');
    }

    const { postId, content } = req.body;
    const username = req.user.username;

    try {
        // Find the post by postId and add a comment
        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(postId) }, // Find the post by ID
            { $push: { comments: { username, content, createdAt: new Date() } } } // Push new comment
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send('해당 게시물을 찾을 수 없습니다.');
        }

        res.status(201).json({ message: '댓글이 성공적으로 추가되었습니다.' });
    } catch (error) {
        console.error('댓글 생성 중 오류 발생:', error);
        res.status(500).send('댓글 생성 중 오류가 발생했습니다.');
    }
});

app.post('/question', async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.status(401).send('로그인이 필요합니다.');
  }

  const { question } = req.body;
  const username = req.user.username;
  const name = req.user.name; // 인증된 사용자 정보 사용

  try {
      const result = await db.collection('qna').insertOne({ username: username, name: name, question: question, createdAt: new Date() });
      res.status(201).json({ message: '질문이 성공적으로 생성되었습니다.', qnaId: result.insertedId });
  } catch (error) {
      console.error('질문 생성 중 오류 발생:', error);
      res.status(500).send('질문 생성 중 오류가 발생했습니다.');
  }
});

app.post('/answer', async (req, res) => {
  if (!req.isAuthenticated()) {
      return res.status(401).send('로그인이 필요합니다.');
  }

  const { qnaId, content } = req.body;
  const username = req.user.username;

  try {
      // Find the post by postId and add a comment
      const result = await db.collection('posts').updateOne(
          { _id: new ObjectId(qnaId) }, // Find the post by ID
          { $push: { answers: { username, answer, createdAt: new Date() } } } // Push new comment
      );

      if (result.modifiedCount === 0) {
          return res.status(404).send('해당 질문을 찾을 수 없습니다.');
      }

      res.status(201).json({ message: '답변이 성공적으로 추가되었습니다.' });
  } catch (error) {
      console.error('답변 생성 중 오류 발생:', error);
      res.status(500).send('답변 생성 중 오류가 발생했습니다.');
  }
});