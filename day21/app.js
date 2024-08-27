const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressSession = require("express-session");
// 파일 업로드용 미들웨어
var multer = require('multer');
var fs = require('fs');

// multer 미들웨어 사용: 미들웨어 사용 순서 
// body-parser -> multer -> router 순으로 실행
var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, 'uploads');
    },
    filename: function(req, file, callback) {
        // 한글 파일명 깨짐 방지
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // 파일명 중복을 방지하기 위한 처리
        // Date.now() <-- 타임스템프
        let index = fileName .lastIndexOf(".");
        let newFileName = fileName .substring(0, index);
        newFileName += Date.now();
        newFileName += fileName .substring(index);
        callback(null, newFileName);
    }
});
// 파일 제한: 10개, 1G 이하
var upload = multer({
    storage: storage,
    limits: {
        files: 10,
        fileSize: 1024 * 1024 * 1024
    }
});

app.set('port', 3000);
app.set("views", "views");
app.set("view engine", "ejs");

// 외부
app.use(express.static("public"));
app.use('/uploads', express.static("uploads"));
// POST 방식으로 파라미터 전달 받기 위한 설정
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
// 쿠키 사용 미들웨어 설정
app.use(cookieParser());
// 세션 미들웨어 등록
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

// 임시 데이터 
const memberList = [
    {no:101, id:"user01", password:"1234", name:"홍길동", email:"hong@gmail.com"},
    {no:102, id:"user02", password:"12345", name:"김길동", email:"kim@gmail.com"},
    {no:103, id:"user03", password:"123", name:"박길동", email:"lee@gmail.com"},
    {no:104, id:"user04", password:"123456", name:"이길동", email:"park@gmail.com"}
];
let noCnt = 105;

// 쇼핑몰 상품 목록
const carList = [
    {
        _id:111, 
        name:'SM5', 
        price:3000, 
        year:1999, 
        company:'SAMSUNG',
        writedate: "",
        photos: [
            {
                originalname: "르노삼성sm520.png", 
                filename: "르노삼성sm520.png",
                filesize: 371000,
                mimetype: "img/png"
            },{ 
                originalname: "르노삼성sm5.png", 
                filename: "르노삼성sm5.png",
                filesize: 95900,
                mimetype: "img/png"
            }
        ]
    }
];
let carSeq=117;

// 요청 라운팅 사용
const router = express.Router();

router.route("/home").get((req,res)=> {
    req.app.render("home/Home", {}, (err, html)=>{
        res.end(html);
    });
});
router.route("/profile").get((req,res)=> {
    req.app.render("profile/Profile", {}, (err, html)=>{
        res.end(html);
    });
});
router.route("/member").get((req,res)=> {
    // 로그인이 되어 있다면 member 페이지를 보여준다.
    // 쿠키는 사용자쪽에 전달(res), 세션은 요청 들어올때 생성(req)
    if(req.session.user !== undefined) {
        const user = req.session.user;
        req.app.render("member/Member", {user}, (err, html)=>{
            res.end(html);
        });
    } else {
        res.redirect("/login");
    }
});
router.route("/login").get((req,res)=> {
    req.app.render("member/Login", {}, (err, html)=>{
        // 사용자(접속자)의 로컬에 쿠키가 저장 된다.
        res.cookie('user', {
            id:'TestUser',
            name: '테스트 유저',
            authorized: true
        });
        res.end(html);
    });
});
router.route("/login").post((req,res)=> {
    console.log(req.body.id, req.body.password);
    const idx = memberList.findIndex(member=>member.id===req.body.id);
    if(idx != -1) {
        if(memberList[idx].password === req.body.password) {
            console.log("로그인 성공!");
            // 세션에 로그인 정보를 등록 후 멤버 페이지 이동
            req.session.user = {
                id: req.body.id,
                name: memberList[idx].name,
                email: memberList[idx].email, 
                no: memberList[idx].no
            }
            res.redirect("/member");
        } else {
            console.log("로그인 실패! 패스워드가 맞지 않습니다.");
            // 다시 로그인 페이지로 다시 이동
            res.redirect("/login");
        }
    } else {
        console.log("존재하지 않는 계정입니다.");
        res.redirect("/login");
    }
});
router.route("/logout").get((req, res)=>{
    console.log("GET - /logout 호출 ...");
    // 로그인 된 상태라면 로그아웃
    if(!req.session.user) {
        console.log("아직 로그인 전 상태입니다.");
        res.redirect("/login");
        return;
    }
    // 세션의 user 정보를 제거 해서 logout처리
    req.session.destroy((err)=>{
        if(err) throw err;
        console.log("로그아웃 성공!");
        res.redirect("/login");
    });
});
router.route("/joinus").get((req,res)=> {
    // 회원 가입 ejs 페이지 forward
    req.app.render("member/Joinus", {}, (err, html)=>{
        res.end(html);
    });
});
router.route("/joinus").post((req,res)=> {
    // 회원 가입 처리 후 목록으로 갱신
    res.redirect("/member");
});
router.route("/gallery").get((req,res)=> {
    req.app.render("gallery/Gallery", {}, (err, html)=>{
        res.end(html);
    });
});

// ---- 쇼핑몰 기능
router.route("/shop").get((req,res)=> {
    // forward ... 주소의 내용이 아닌 다른 파일의 내용 표시
    req.app.render("shop/Shop", {carList}, (err, html)=>{
        if(err) throw err;
        res.end(html);
    });
});
router.route("/shop/insert").get((req,res)=> {
    req.app.render("shop/Insert", {}, (err, html)=>{
        res.end(html);
    });
});
router.route("/shop/insert").post(upload.array('photo', 1),(req,res)=> {
    console.log("POST - /shop/insert");
    // 구조분해 할당으로 body의 파라미터를 꺼낸다.
    const {name, price, year, company} = req.body;
    const newCar = {
        _id:carSeq++, name, price, year, company,
        writedate: Date.now(),
        photos: []
    };
    newCar.photos = req.files;
    carList.push(newCar);
    ///res.send(carList);
    res.redirect('/shop');
});
router.route("/shop/modify").get((req,res)=> {
    const _id = parseInt(req.query._id);
    console.log(_id)
    const idx = carList.findIndex(car=>_id===car._id);
    console.log(idx);
    if(idx === -1) {
        console.log("상품이 존재 하지 않습니다.")
        res.redirect("/shop");
        return;
    }
    req.app.render("shop/Modify", {car:carList[idx]}, (err, html)=>{
        if(err) throw err;
        res.end(html);
    });
});
router.route("/shop/modify").post((req,res)=> {
    console.log("POST - /shop/modify 호출");
    console.dir(req.body);
    res.redirect('/shop');
});
router.route("/shop/detail").get((req,res)=> {
    // 쿼리로 전송된 데이터는 모두 문자열이다. 
    // parseInt() 필수 "56" <-- numeric
    const _id = parseInt(req.query._id);
    //console.log(_id)
    const idx = carList.findIndex(car=>_id===car._id);
    //console.log(idx);
    if(idx === -1) {
        console.log("상품이 존재 하지 않습니다.")
        res.redirect("/shop");
        return;
    }
    req.app.render("shop/Detail", {car:carList[idx]}, (err, html)=>{
        if(err) throw err;
        res.end(html);
    });
});
router.route("/shop/delete").get((req,res)=> {
    req.app.render("shop/Delete", {}, (err, html)=>{
        res.end(html);
    });
});
router.route("/shop/cart").get((req,res)=> {
    req.app.render("shop/Cart", {}, (err, html)=>{
        res.end(html);
    });
});
// --- 쇼핑몰 기능 끝

// --- TodoList 기능 구현 시작
// HTML 폼에서 REST method 방식은 GET과 POST만 사용 가능
// Ajax를 사용하지 않기 때문에 GET과 POST만 처리 가능
// app.get()은 ejs 뷰로 forward 시켜주기
// app.post()은 DB와 연동해서 처리하는 process 역할
// forward 란, 주소의 내용이 아닌 다른 파일의 내용 표시하는 것
const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient("mongodb://localhost:27017");
const dbName = "comstudy";
const collectionName = "todolist";

/* 몽고디비에 데이터 추가
db.todolist.insertMany([
{title:"밥먹기2", done:false},
{title:"잠자기2", done:false},
{title:"공부하기2", done:true},
{title:"친구랑 놀기2", done:false}
])
*/
app.get("/todo/list", async (req, res) => {
    //res.render("todolist/TodoList", {todoList});
    try {
        client.connect();
        const database = client.db(dbName);
        const todoCollection = database.collection(collectionName);
        const QUERY = {}
        const cursor = todoCollection.find(QUERY, {});
        if((await todoCollection.countDocuments(QUERY)) === 0) {
            console.log("No Documents find!");
        }
        const todoList = [];
        for await (const doc of cursor) {
            todoList.push(doc);
            console.dir(doc);
        }
        req.app.render("todolist/TodoList", {todoList}, (err, html) => {
            if(err) throw err;
            res.end(html);
        });
    } finally {
        await client.close();
    }
});

app.get("/todo/input", (req, res) => {
    res.render("todolist/TodoInput", {});
});

app.get("/todo/detail", (req, res) => {
    res.render("todolist/TodoDetail", {});
});

app.get("/todo/modify", async (req, res) => {
    // const todo = {
    //     _id : "66cd4f620472617042b03fce",
    //     title: "테스트 Todo",
    //     done: false
    // }
    // res.render("todolist/TodoModify", {todo});
    try {
        await client.connect();
        const database = client.db("dbName");
        const collection = database.collection(collectionName);

        const query = { _id: new ObjectId(req.body._id) };
        const fetch = await collection.findOne(query);
        console.log("Fetched document:", fetch);
        res.render("todolist/TodoModify", {todo: fetch});
        } finally {
            await client.close();
        }
});

app.get("/todo/delete", async (res, req) => {
    try {
        await client.connect();
        const database = client.db("dbName");
        const collection = database.collection(collectionName);

        const query = { _id: new ObjectId(req.query._id) };
        const fetch = await collection.findOne(query);
        res.render("todolist/TodoDelete", {todo: fetch});
    } finally  {
        await client.close();
    }
});

// 저장처리 - 몽고디비와 연동
app.post("/todo/input", async (req, res) => {
    const doc = {
        title: req.body.title,
        done: (req.body.done == "true"?true:false)
    }
    console.dir(doc);
    try {
        client.connect();
        const database = client.db(dbName);
        const cars = database.collection(collectionName);
        const result = await cars.insertOne(doc);
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
        res.redirect("/todo/list");
      } finally {
        await client.close();
      }
});

app.post("/todo/detail", (req, res) => {
    res.redirect("/todo/list", {});
});

app.post("/todo/modify", async (req, res) => {
    console.log(req.body._id);
    try {
        await client.connect();
        const database = client.db(dbName);
        const movies = database.collection(collectionName);
        const filters = { _id: new ObjectId(req.body._id) };
        const options = { upsert: true };
        const UpdateDoc = {
            $set: {
                title: req.body.title,
                done: (req.body.done=="true"?true:false)
            }
        }
        const result = await movies.updateOne(filters, UpdateDoc, options);
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
        //res.redirect("/todo/list");
      } finally {
        await client.close();
      }
      res.redirect("/todo/list");
});

app.delete("/todo/delete", async (req, res) => {
    console.log(req.body._id);
    try {
        client.connect();
        const database = client.db(dbName);
        const movies = database.collection(collectionName);
        const query = { _id: new ObjectId(req.body._id) };

        const result = await movies.deleteOne(query);
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
        //res.redirect("/todo/list");
      } finally {
        await client.close();
      }
      res.redirect("/todo/list");
});
// --- TodoList 기능 구현 끝

// router 설정 맨 아래에 미들웨어 등록
app.use('/', router);

// 등록되지 않은 패스에 대해 페이지 오류 응답
// app.all('*', function(req, res) {
//     res.status(404).send('<h1>ERROR - 페이지를 찾을 수 없습니다.</h1>')
// });

const expressErrorHandler = require('express-error-handler');
const { queryObjects } = require("v8");
//모든 라우터 처리 후 404 오류 페이지 처리
const errorHandler = expressErrorHandler({
    static : {
        '404':'./public/404.html'
    }
});
app.use(expressErrorHandler.httpError(404) );
app.use(errorHandler );

// 서버 생성 및 실행
const server = http.createServer(app);
server.listen(app.get('port'), ()=>{
    console.log(`Run on server >>> http://localhost:${app.get('port')}`);
});