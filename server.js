const http = require("http");
const fs = require("fs");

const server = http.createServer((req, res) => {
    //  console.log("Hello vanier students");
  
    res.setHeader("Content-Type", "text/html");
    let path = "./";
  
    switch(req.url){
      case "/":
          res.statusCode= 200;
          path += 'index.html';
          break;
          case "/about":
              res.statusCode= 200;
              path+=`about.html`;
              break;
          case "/login":
              res.statusCode= 301;
               path+='login.html';
            //  res.end();
              break;
          default:
                  res.statusCode= 404;
                  path+="404.html";
                  break;
    }
    
  fs.readFile(path, (err, data) => {
    if (err){
        console.log(err);
    } else {
        res.write(data);
        res.end();
    }
  })

 });
 
server.listen(3000, "localhost", () => {
    console.log(`Listening for requests on port 3000`);
})

