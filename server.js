const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");

const app = express();
const PORT = 3000;


// ======================================
// Middleware
// ======================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(__dirname));


// ======================================
// Session
// ======================================

app.use(session({
    secret: "it-shop-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));


// ======================================
// เชื่อมต่อ MySQL
// ======================================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "login"
});


db.connect((err) => {

    if (err) {

        console.error(
            "เชื่อมต่อฐานข้อมูลไม่สำเร็จ:",
            err
        );

        return;

    }

    console.log(
        "เชื่อมต่อฐานข้อมูลสำเร็จ!"
    );

});


// ======================================
// สมัครสมาชิก
// ======================================

app.get("/", (req, res) => {

    res.sendFile(
        __dirname + "/index.html"
    );

});


app.post("/register", (req, res) => {

    const {
        name,
        lname,
        email,
        password
    } = req.body;


    const sql = `
        INSERT INTO datalogin
        (name, lname, email, password)
        VALUES (?, ?, ?, ?)
    `;


    db.query(
        sql,
        [name, lname, email, password],
        (err) => {

            if (err) {

                console.error(err);

                return res.send(`
                    <h2>
                        สมัครสมาชิกไม่สำเร็จ
                    </h2>

                    <a href="/">
                        กลับ
                    </a>
                `);

            }


            res.redirect("/login");

        }
    );

});


// ======================================
// LOGIN
// ======================================

app.get("/login", (req, res) => {

    res.sendFile(
        __dirname + "/login.html"
    );

});


app.post("/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    const sql = `
        SELECT *
        FROM datalogin
        WHERE email = ?
        AND password = ?
    `;


    db.query(
        sql,
        [email, password],
        (err, results) => {

            if (err) {

                console.error(err);

                return res.send(
                    "เกิดข้อผิดพลาด"
                );

            }


            // ==========================
            // Login ไม่ผ่าน
            // ==========================

            if (results.length === 0) {

                return res.send(`
                    <div style="
                        text-align:center;
                        margin-top:100px;
                    ">

                        <h2>
                            ❌ Email หรือ Password
                            ไม่ถูกต้อง
                        </h2>

                        <a href="/login">
                            กลับไปเข้าสู่ระบบ
                        </a>

                    </div>
                `);

            }


            // ==========================
            // Login สำเร็จ
            // ==========================

            const user =
                results[0];


            const userEmail =
                user.email;


            // ==========================
            // ค้นหา Email ใน user_session
            // ==========================

            const sessionSQL = `
                SELECT *
                FROM user_session
                WHERE email = ?
            `;


            db.query(
                sessionSQL,
                [userEmail],
                (err, sessionResults) => {


                    if (err) {

                        console.error(err);

                        return res.send(
                            "เกิดข้อผิดพลาด"
                        );

                    }


                    // ==========================
                    // มีบัญชีนี้อยู่แล้ว
                    // ==========================

                    if (
                        sessionResults.length > 0
                    ) {

                        const userSession =
                            sessionResults[0];


                        req.session.userId =
                            userSession.id;


                        req.session.email =
                            userSession.email;


                        console.log(
                            "User ID:",
                            userSession.id
                        );


                        return res.redirect(
                            "/home"
                        );

                    }


                    // ==========================
                    // ยังไม่มี → สร้างใหม่
                    // ==========================

                    const insertSQL = `
                        INSERT INTO user_session
                        (email)
                        VALUES (?)
                    `;


                    db.query(
                        insertSQL,
                        [userEmail],
                        (err, result) => {


                            if (err) {

                                console.error(err);

                                return res.send(
                                    "สร้างบัญชี Session ไม่สำเร็จ"
                                );

                            }


                            // ID ที่ MySQL สร้างให้

                            req.session.userId =
                                result.insertId;


                            req.session.email =
                                userEmail;


                            console.log(
                                "สร้าง User ID:",
                                result.insertId
                            );


                            res.redirect(
                                "/home"
                            );

                        }
                    );

                }
            );

        }
    );

});


// ======================================
// HOME
// ======================================

app.get("/home", (req, res) => {

    res.sendFile(
        __dirname + "/home.html"
    );

});


// ======================================
// PRODUCT
// ======================================

app.get("/product1", (req, res) => {

    res.sendFile(
        __dirname + "/product1.html"
    );

});


app.get("/product2", (req, res) => {

    res.sendFile(
        __dirname + "/product2.html"
    );

});


app.get("/product3", (req, res) => {

    res.sendFile(
        __dirname + "/product3.html"
    );

});


app.get("/product4", (req, res) => {

    res.sendFile(
        __dirname + "/product4.html"
    );

});


// ======================================
// CHECKOUT
// ======================================

app.get("/checkout", (req, res) => {

    res.sendFile(
        __dirname + "/checkout.html"
    );

});


// ======================================
// สร้างเลขคำสั่งซื้อ
// ======================================

function generateOrderNumber() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    const random =
        Math.floor(
            1000 +
            Math.random() * 9000
        );


    return `IT${year}${month}${day}${random}`;

}


// ======================================
// รับคำสั่งซื้อ
// ======================================

app.post("/create-order", (req, res) => {


    // ==================================
    // ตรวจสอบว่า Login อยู่หรือไม่
    // ==================================

    if (!req.session.userId) {

        return res.status(401).json({

            success: false,

            message:
                "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ"

        });

    }


    const {

        firstName,
        lastName,
        address,
        postcode,
        phone,
        email,
        cart

    } = req.body;


    // ==================================
    // ตรวจสอบข้อมูล
    // ==================================

    if (
        !firstName ||
        !lastName ||
        !address ||
        !postcode ||
        !phone ||
        !email ||
        !cart ||
        cart.length === 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "ข้อมูลไม่ครบ"

        });

    }


    // ==================================
    // สร้างเลข Order
    // ==================================

    const orderNumber =
        generateOrderNumber();


    // ==================================
    // คำนวณยอด
    // ==================================

    let total = 0;


    cart.forEach(item => {

        total +=
            Number(item.price) *
            Number(item.quantity);

    });


    // ==================================
    // บันทึก orders
    // ==================================

    const orderSQL = `

        INSERT INTO orders

        (
            order_number,
            first_name,
            last_name,
            address,
            postcode,
            phone,
            email,
            total,
            status
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

    `;


    db.query(

        orderSQL,

        [
            orderNumber,
            firstName,
            lastName,
            address,
            postcode,
            phone,
            email,
            total,
            "รอการชำระเงิน"
        ],

        (err) => {


            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "บันทึกคำสั่งซื้อไม่สำเร็จ"

                });

            }


            // ==================================
            // บันทึก order_items
            // ==================================

            const itemSQL = `

                INSERT INTO order_items

                (
                    order_number,
                    product_name,
                    price,
                    quantity,
                    subtotal
                )

                VALUES ?

            `;


            const items =
                cart.map(item => [

                    orderNumber,

                    item.name,

                    Number(item.price),

                    Number(item.quantity),

                    Number(item.price) *
                    Number(item.quantity)

                ]);


            db.query(

                itemSQL,

                [items],

                (err) => {


                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message:
                                "บันทึกรายการสินค้าไม่สำเร็จ"

                        });

                    }


                    // ==================================
                    // เชื่อม User กับ Order
                    // ==================================

                    const userOrderSQL = `

                        INSERT INTO user_session_orders

                        (
                            user_id,
                            order_number
                        )

                        VALUES (?, ?)

                    `;


                    db.query(

                        userOrderSQL,

                        [
                            req.session.userId,
                            orderNumber
                        ],

                        (err) => {


                            if (err) {

                                console.error(err);

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "เชื่อมบัญชีกับคำสั่งซื้อไม่สำเร็จ"

                                });

                            }


                            // ==================================
                            // สำเร็จ
                            // ==================================

                            res.json({

                                success: true,

                                orderNumber:
                                    orderNumber,

                                total:
                                    total

                            });

                        }

                    );

                }

            );

        }

    );

});
// ======================================
// MY ORDERS PAGE
// ======================================

app.get("/my-orders", (req, res) => {

    res.sendFile(
        __dirname + "/my-orders.html"
    );

});


// ======================================
// API: ดึงคำสั่งซื้อของบัญชีที่ Login
// ======================================

app.get("/api/my-orders", (req, res) => {

    // ตรวจสอบว่า Login อยู่หรือไม่

    if (!req.session.userId) {

        return res.status(401).json({

            success: false,

            message: "กรุณาเข้าสู่ระบบ"

        });

    }


    // ID ของบัญชีที่ Login อยู่

    const userId =
        req.session.userId;


    // ==================================
    // ดึงคำสั่งซื้อ
    // ==================================

    const sql = `

        SELECT

            o.*,

            COUNT(oi.id) AS item_count

        FROM user_session_orders AS uso

        INNER JOIN orders AS o
            ON uso.order_number = o.order_number

        LEFT JOIN order_items AS oi
            ON o.order_number = oi.order_number

        WHERE uso.user_id = ?

        GROUP BY o.id

        ORDER BY o.created_at DESC

    `;


    db.query(

        sql,

        [userId],

        (err, results) => {

            if (err) {

                console.error(
                    "ดึงคำสั่งซื้อไม่สำเร็จ:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "ไม่สามารถโหลดคำสั่งซื้อได้"

                });

            }


            // ส่งข้อมูลกลับไปให้ my-orders.html

            res.json({

                success: true,

                orders: results

            });

        }

    );

});
// ======================================
// ADMIN ORDERS PAGE
// ======================================

app.get("/admin-orders", (req, res) => {

    res.sendFile(
        __dirname + "/admin-orders.html"
    );

});

// ======================================
// API: ดึงคำสั่งซื้อทั้งหมดสำหรับ Admin
// ======================================

app.get("/api/admin/orders", (req, res) => {

    const sql = `

        SELECT *

        FROM orders

        ORDER BY created_at DESC

    `;


    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "ไม่สามารถโหลดคำสั่งซื้อได้"

                });

            }


            res.json({

                success: true,

                orders: results

            });

        }
    );

});

// ======================================
// เปลี่ยนสถานะคำสั่งซื้อ
// ======================================

app.post("/api/order/:orderNumber/status", (req, res) => {

    const orderNumber = req.params.orderNumber;
    const status = req.body.status;

    const allowedStatus = [
        "รอการชำระเงิน",
        "ชำระเงินแล้ว",
        "กำลังเตรียมสินค้า",
        "กำลังจัดส่ง",
        "กำลังนำจ่าย",
        "จัดส่งสำเร็จ"
    ];

    // ตรวจสอบสถานะ

    if (!allowedStatus.includes(status)) {

        return res.status(400).json({
            success: false,
            message: "สถานะไม่ถูกต้อง"
        });

    }

    // เปลี่ยนสถานะในฐานข้อมูล

    const sql = `
        UPDATE orders
        SET status = ?
        WHERE order_number = ?
    `;

    db.query(
        sql,
        [status, orderNumber],
        (err, result) => {

            if (err) {

                console.error(
                    "UPDATE STATUS ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "ไม่สามารถเปลี่ยนสถานะได้"
                });

            }

            // ไม่พบ Order

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "ไม่พบคำสั่งซื้อ " +
                        orderNumber
                });

            }

            console.log(
                `เปลี่ยนสถานะ ${orderNumber} → ${status}`
            );

            res.json({
                success: true,
                message:
                    "เปลี่ยนสถานะสำเร็จ",
                orderNumber:
                    orderNumber,
                status:
                    status
            });

        }
    );

});


// ======================================
// TRACKING
// ======================================

app.get("/tracking", (req, res) => {

    res.sendFile(
        __dirname + "/tracking.html"
    );

});


// ======================================
// ค้นหาคำสั่งซื้อ
// ======================================

app.get(
    "/api/order/:orderNumber",
    (req, res) => {

        const orderNumber =
            req.params.orderNumber;


        const orderSQL = `

            SELECT *

            FROM orders

            WHERE order_number = ?

        `;


        db.query(

            orderSQL,

            [orderNumber],

            (err, orders) => {


                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false

                    });

                }


                if (
                    orders.length === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "ไม่พบคำสั่งซื้อ"

                    });

                }


                const itemSQL = `

                    SELECT *

                    FROM order_items

                    WHERE order_number = ?

                `;


                db.query(

                    itemSQL,

                    [orderNumber],

                    (err, items) => {


                        if (err) {

                            console.error(err);

                            return res.status(500).json({

                                success: false

                            });

                        }


                        res.json({

                            success: true,

                            order:
                                orders[0],

                            items:
                                items

                        });

                    }

                );

            }

        );

    }
);


// ======================================
// LOGOUT
// ======================================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login");

    });

});


// ======================================
// START SERVER
// ======================================

app.listen(
    PORT,
    () => {

        console.log(
            `เว็บไซต์เปิดที่ http://localhost:${PORT}`
        );

    }
);