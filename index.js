//Importing thr required modules
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = 3000;
//Creating a connection to the database
const db = new pg.Client({
    user:process.env.DATABASE_USER,
    host:process.env.DATABASE_HOST,
    database:process.env.DATABASE_NAME,
    password:process.env.DATABASE_PASSWORD,
    port:process.env.DATABASE_PORT
    
});

db.connect();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

//Creating a route to get all the books from the database and send it as response to the client side
app.get("/",async(req,res)=>{
    try{
        const result = await db.query("SELECT * FROM books ORDER BY id ASC");
        const books = result.rows;
        for(let book of books){
            const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&format=json&jscmd=data`);
            let bookData = response.data[`ISBN:${book.isbn}`];

            if (bookData) {
                book.cover = bookData.cover ? bookData.cover.large : null;
               if(bookData.description){
                book.description = typeof bookData.description === 'string' ? bookData.description : bookData.description.value;
               }
            }
        }
          res.render("index.ejs",{books:books});
    }catch(err){
        console.log(err);
    }
})

//Creating a route to get the details of a particular book and send it as response to the client side
app.get("/book/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
        const book = result.rows[0];

        const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&format=json&jscmd=data`);
        let bookData = response.data[`ISBN:${book.isbn}`];

        if (bookData) {
            book.cover = bookData.cover ? bookData.cover.large : null;
            if (bookData.description) {
                book.description = typeof bookData.description === 'string' ? bookData.description : bookData.description.value;
            }
        }

        res.render("book", { book: book });
    } catch (err) {
        console.log(err);
    }
});
//Creating a route to sort the books according to the user's choice
app.post("/sort", async (req, res) => {
    let option = req.body.options;
  
    let orderBy;
    switch(option){
      case 'Date':
        orderBy = 'publish_date';
        break;
      case 'Rating':
        orderBy = 'rating'; 
        break;
      case 'Price':
        orderBy = 'price';
        break;
      default:
        orderBy = 'id';
    }
  
    try {
      const result = await db.query(`SELECT * FROM books ORDER BY ${orderBy} DESC`);
      const books = await Promise.all(result.rows.map(async book => {
        const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&format=json&jscmd=data`);
        let bookData = response.data[`ISBN:${book.isbn}`];
        if (bookData && bookData.cover) {
          book.cover = bookData.cover.large;
        }
        return book;
      }));
      res.render("index.ejs", {books});
    } catch(err) {
      console.log(err);   
    } 
  })
//Creating a route to edit the details of a particular book from the Database
  app.get("/edit/:id", (req, res) => {
    const { id } = req.params;
    res.render("edit", { id: id });
  })
  //Creating a route to delete a particular book from the database
  app.get("/delete/:id", (req, res) => {
    const { id } = req.params;
    res.render("delete", { id: id });
  })
//Handling the edit route as it is a post request
  app.post("/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { rating, description } = req.body;
    try {
      await db.query('UPDATE books SET rating = $1, description = $2 WHERE id = $3', [rating, description, id]);
      res.redirect("/");
    } catch (err) {
      console.log(err);
      res.send("Error in updating the book");
    }
  })
  //Handling the delete route as it is a post request
  app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM books WHERE id = $1', [id]);
      res.redirect("/");
    } catch (err) {
      console.log(err);
      res.send("Error in deleting the book");
    }
  })
//The port of the server ie 3000 will be used here for running the application on localhost:3000
app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
})