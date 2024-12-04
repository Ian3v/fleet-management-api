/* -------------------------------------------------------------------------- */
//El Front se encuentra en   Front React/1 Curso FreeCodeCamp/ 2 testimonios Freecodecamp
/* -------------------------------------------------------------------------- */

import { timeStamp } from "console";
import e, { response } from "express";
import express, { Application, Response, Request } from "express";
import { Client } from "pg";
import * as bcrypt from "bcrypt";
import { parse } from "path";
import { request } from "http";
import { PassThrough } from "stream";
import { hasSubscribers } from "diagnostics_channel";

const app: Application = express();

const personajes = ["ra", "re"];
const [ra] = personajes;

const PORT: number = 666;

app.use(express.json());

// Configuración de la base de datos
const client = new Client({
  host: "localhost",
  database: "db_taxis_1",
  user: "root2",
  password: "root2",
});

// Middleware para parsear JSON
app.use(express.json());

// Conectar a la base de datos
client
  .connect()
  .then(() => console.log("Conectado a la base de datos 👽"))
  .catch((err) => console.error("Error al conectar a la base de datos", err));

//? http://localhost:666/taxis?page=1&limit=10
app.get("/taxis", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10; // Registros por página, por defecto 10
  const page = parseInt(req.query.page as string) || 1; // Página actual, por defecto 1
  const plate = req.query.plate as string; // Captura el valor de plateParam (si existe)

  console.log("/taxis limit> ", limit);
  console.log("/taxis page> ", page);
  console.log("/taxis   plate> ", plate);

  // const offset = (page - 1)* limit
  let query = `SELECT * FROM taxis`;

  if (plate) {
    query += ` WHERE plate LIKE '%${plate}%'`; // Filtro por placa
  }

  query += ` ORDER BY id LIMIT ${limit} OFFSET ${page}`;

  console.log(">>> ", query);

  try {
    const result = await client.query(query);
    res.json(result.rows); // Responde con los datos obtenidos
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send("Error en el servidor"); // Manejo de errores
  }

  // client
  //   .query(query)
  //   .then((result) => res.json(result.rows))
  //   .catch((err) => {
  //     console.error("Error en la consulta:", err);
  //     res.status(500).send("Error en el servidor");
  //   });
});

//? TRAJECTORIES Si o si requiere taxi id y date
app.get("/trajectories", async (req: Request, res: Response) => {
  const taxiid = parseInt(req.query.taxiId as string);
  let date = req.query.date as string;

  // Fecha y formato
  if (date && date.includes("-")) {
    const parts = date.split("-");

    let yy = parseInt(parts[2]);
    let mm = parseInt(parts[1]);
    let dd = parseInt(parts[0]);

    // if(typeof( yy) !== 'number' || typeof( mm) !== 'number' || typeof( dd) !== 'number' ){
    //   return res.status(400).json({ message: 'responds with 400 if date badly formatted' });
    // }
    console.log(
      "???????????????????",
      typeof yy,
      yy,
      " ",
      typeof mm,
      mm,
      " ",
      typeof dd,
      dd
    );

    if (yy > 0 && mm > 0 && dd > 0) {
      console.log(dd, "sies un number");
      if (parts[2].length === 4) {
        // Formato DD-MM-YYYY detectado
        date = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convertimos a YYYY-MM-DD
      }
    } else {
      return res
        .status(400)
        .json({ message: "responds with 400 if date badly formatted" });
    }
  }

  // let query = `SELECT * FROM trajectories WHERE taxi_id = ${taxiid} AND DATE(date) = '2008-02-02'`
  let query = "";
  if (!taxiid) {
    return res.status(400).json({
      message: 'responds with 400 for missing required parameters (taxiId)"',
    });
  }
  if (!date) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: date" });
  } else {
    // query = `SELECT * FROM trajectories WHERE taxi_id = ${taxiid} AND DATE(date) = '${date}'`;
    // query = `SELECT *, date AT TIME ZONE 'UTC' AS date utc FROM trajectories WHERE taxi_id =  ${taxiid} AND DATE(date) = ${date}`
    query = `SELECT *, date AT TIME ZONE 'UTC' 
            AS date_utc 
            FROM trajectories 
            WHERE taxi_id = ${taxiid} 
            AND DATE(date AT TIME ZONE 'UTC') = '${date}';`;

    console.log(">> ", query);
  }
  // console.log('>>>>>> taxiid', taxiid);
  // console.log('>>>>>> date', date);
  // console.log('query', query);

  try {
    const result = await client.query(query);
    const resultRows = result.rows;

    console.log(
      ">>>>> Numeros de resultados de la consulta",
      resultRows.length
    );
    if (resultRows.length <= 0) {
      return res.status(404).json({ message: "Taxi not found" });
    } else {
      const resultFinal = resultRows.map((i) => {
        return {
          taxiId: i.taxi_id,
          plate: i.plate,
          timestamp: i.date,
          latitude: i.latitude,
          longitude: i.longitude,
        };
      });
      res.json(resultFinal);
    }
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send("Error en el servidor"); // Manejo de errores
  }
});

app.get("/trajectories/latest", async (req: Request, res: Response) => {
  let query = `WITH LatestData AS (
                  SELECT 
                      taxis.id,
                      taxis.plate,  
                      trajectories.latitude, 
                      trajectories.longitude, 
                      trajectories.date,
                      ROW_NUMBER() OVER (PARTITION BY taxis.plate ORDER BY trajectories.date DESC) AS rn
                  FROM taxis
                  INNER JOIN trajectories ON taxis.id = trajectories.taxi_Id
                  )
                  SELECT id, plate, latitude, longitude, date
                  FROM LatestData
                  WHERE rn = 1;`;
  const requiredProperties = [
    "taxiId",
    "plate",
    "timestamp",
    "latitude",
    "longitude",
  ];

  try {
    const result = await client.query(query);
    // console.log(result.rows);
    const data = result.rows;
    // console.log( data);
    // res.json(result.rows)

    // console.log(data[0].);
    const resultFinal = data.map((i) => {
      return {
        taxiId: i.id,
        plate: i.plate,
        timestamp: i.date,
        latitude: i.latitude,
        longitude: i.longitude,
      };
    });

    console.log(resultFinal);
    res.json(resultFinal);
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send("Error en el servidor"); // Manejo de errores
  }
});

app.get("/users", async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const pageInt = parseInt(page as string, 10);
  const limitInt = parseInt(limit as string, 10);

  if (isNaN(pageInt) || pageInt < 1) {
    return res.status(400).json({ error: "Invalid page" });
  }
  if (isNaN(limitInt) || limitInt < 1) {
    return res.status(400).json({ error: "Invalid lmit" });
  }

  let query = `SELECT * FROM users LIMIT ${limitInt}`;
  try {
    //  query = `SELECT * FROM users LIMIT ${limitInt}`;
    console.log("#### ELSE \n > ", query);
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error :", err);
  }
});



/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
// Codigo para q funcione el POST dos partes el async y app.use


// async () => {
//   //Esperar q el servidor este listo
//   app.listen(666, async () => {
//     console.log("Servidor ejecutandose 666");
//   });

//   //Simulamos la solicutd post
//   console.log("Simulando la solictud POST");
//   try {
//     const response = await fetch("http://localhost:666/users", {
//       method: "POST",
//       headers: {
//         "Content-Type": "applicaction/json",
//       },
//       // ,
//       // body: JSON.stringify({
//       //   name: 'unoFetch',
//       //   email: "unoFetch@mail.com",
//       //   password: "unoFetchPassword"
//       // }),
//     });
//     const data = await response.json();
//     console.log("Repsuesta del servidor,", data);
//   } catch (error) {
//     console.log("Error durante la simulacion", error);
//   }
  
// };
// app.use(express.urlencoded({ extended: true }));
/* -------------------------------------------------------------------------- */


//* -------------------------------------------------------------------------- */
//* -------------------------------------------------------------------------- */
//* POST


app.post('/users', async (req:Request, res:Response)=>{

  //Capturamos los datos del body
  const { email, name, password} = req.body;

  //* >------------------------------------------------------------------------- */
  //* * * * 3 Post users - missing params (email) AND 4 missing password
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Es necesario datos como email' });
  }
  //* -------------------------------------------------------------------------< */

  //Verificar si el usuario ya existe
  const checkQuery = `SELECT * FROM users WHERE email = '${email}' OR name = '${name}';`;

  try {
    const checkResult = await client.query(checkQuery);

    //* >------------------------------------------------------------------------- */
    //* * * * 2 Post users users existe
    if (checkResult.rows.length > 0) {
      console.log(`>---------------------------------------------\n 
        POST /users  Ya existe users ${email}, ${name}\nPOST /checket `, checkResult.rows[0], 
        "\n-------------------------------------<");
      
        return res.status(409).json({ error: `El usuario ya EXISTE ${email}, ${name}` });
    }
    //* -------------------------------------------------------------------------< */
    

    //* >------------------------------------------------------------------------- */
    //* * * * 1 Post users, donde se crea el usuario si es q no existe  {Grace Hopper, newUser@test.com}, El error q se encontraba esta en el test CREATED -> Created
    const query = `INSERT INTO users (name, email, password)
               VALUES ('${name}', '${email}', '${password}')
               RETURNING id, name, email;`;

      const result = await client.query(query);
      console.log("\n 1 POST >>-----------------------------------------\n Usuario No existe Ya insertado:", result.rows[0]), "\n-------------------------------<<\n";
      res.status(201).json(result.rows[0]);
    //* -------------------------------------------------------------------------< */

  }catch(err){
    console.log("❌ Error en el servidor", err);
    res.status(500).json({ error: "Error en el servidor" });
  }

})
// * -------------------------------------------------------------------------- */
// * -------------------------------------------------------------------------- */





//* -------------------------------------------------------------------------- */
//* -------------------------------------------------------------------------- */
//* * * * PATCH
app.patch("/users/:id", async (req: Request, res: Response) => {
  // console.log("> users/:id ", req.params.id);
  const userId = req.params.id; // el Id del usario q actualizaremos
  const { name, email } = req.body; // Campos que deseas actualizar
  console.log(">>> 1 PATCH recuperando body", req.body);

  //Enviar un id valido
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({
      error: "El ID del Usuario es obligatorio y debe ser un numero valido",
    });
  }

  //* -------------------------------------------------------------------------- */
  //* 3 PATCH users - no body ✅
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log('Cuerpo de la solicitud ausente o vacío');
    return res.status(400).json({ error: "El cuerpo de la solicitud está vacío. Se necesita al menos un campo para actualizar: name o email." });
  }
  //* -------------------------------------------------------------------------- */

  let query = "";

  // Si name y email no estan 
  if (!name && !email) {
    return res
      .status(400)
      .json({
        error: "Se necesita al menos un campo para actualizar: name o email",
      });
  }
  // Si los estan, entonces query actilizara los dos
  if (name && email) {  
    query = `UPDATE users SET name= '${name}', email= '${email}' WHERE id = ${userId}
    RETURNING id, name, email;`;
  }
  //* -------------------------------------------------------------------------- */
  //* * * * 1 Patch users  - si solo esta el name si se actuliza ✅
  if (name && !email) {
    query = `UPDATE users SET name = '${name}' WHERE id = ${userId} 
    RETURNING id, name, email;`;
    console.log("> NAME Solo hay name y no hay email");
    console.log(">query ", query);
  }

  //* -------------------------------------------------------------------------- */
  //* 4 Patch users - email or password ✅
  if (!name && email) {
    return res.status(400).json({ error: "Cannot update email directly" });

  }
  //* -------------------------------------------------------------------------- */

  try {
    const result = await client.query(query);
    //! If q cuando se envia un id=99999

    //* -------------------------------------------------------------------------- */
    //* 2 Patch users - user does not exit ✅
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" }); //TEST SET user does not exit
    }
    //* -------------------------------------------------------------------------- */

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error en el servidor :", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});
//* -------------------------------------------------------------------------- */
//* -------------------------------------------------------------------------- */



//* -------------------------------------------------------------------------- */
//* -------------------------------------------------------------------------- */
// ? DELETE sin parametros

app.delete("/users/:identidicador", async (req: Request, res: Response) => {
  const identidicador = req.params.identidicador;
  console.log(identidicador);

  if (!identidicador) {
    console.log("DELETE users, id es necesario apra elimninar alguno");
    return res
      .status(400)
      .json({ eror: "El ID del usuario deebe ser un numero valido" });
  }

  const query = `SELECT * FROM users WHERE id = ${identidicador}`;
  // console.log('>query ', query);

  try {
    const result = await client.query(query);
    console.log("> Result Rows = ", result.rowCount);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no existe" });
    }
    //Elimnar usuario
    const deleteQuery = `DELETE FROM users WHERE id = ${identidicador} RETURNING id, email, name`;
    console.log(">>Se elimino esta celda Query Delete: ", deleteQuery);
    const resultToDelete = await client.query(deleteQuery);
    return res.status(200).json(resultToDelete.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});
//* -------------------------------------------------------------------------- */
//* -------------------------------------------------------------------------- */




/* -------------------------------------------------------------------------- */
// // INSERTAR USUARIOS
// const insertUser = async (name: string, email: string, password: string) => {
//   const saltRounds = 10;

//   try {
//     //Hasheamos la contrasenia usando bccrypt

//     const hashPassword = await bcrypt.hash(password, saltRounds);
//     console.log(">> ", password);
//     console.log(">> ", hashPassword);
//     //Insertar usuario
//     const query = `INSERT INTO users (name, email, password) 
//     VALUES ('${name}', '${email}', '${hashPassword}');`;
//     console.log(">> ", query);
//     return query;
//   } catch (err) {
//     console.error("Error :", err);
//   }
// };
// // insertUser('Uno','uno@gmail.com','unopoassword')


// /* -------------------------------------------------------------------------- */
// /* -------------------------------------------------------------------------- */
// //Simular el FRONT para enivar los datos en el body y POST capturarlos
// async () => {
//   //Esperar q el servidor este listo
//   app.listen(666, async () => {
//     console.log("Servidor ejecutandose 666");
//   });

//   console.log("Simulando la solictud POST");
//   try {
//     const response = await fetch("http://localhost:666/usersss", {
//       method: "POST",
//       headers: {
//         "Content-Type": "applicaction/json",
//       },
//       // ,
//       // body: JSON.stringify({
//       //   name: 'unoFetch',
//       //   email: "unoFetch@mail.com",
//       //   password: "unoFetchPassword"
//       // }),
//     });
//     const data = await response.json();
//     console.log("Repsuesta del servidor,", data);
//   } catch (error) {
//     console.log("Error durante la simulacion", error);
//   }

// };

// app.use(express.urlencoded({ extended: true }));

// /* -------------------------------------------------------------------------- */
// // /* -------------------------------------------------------------------------- */
// // app.post("/usersss", async (req: Request, res: Response) => {
// //   const { email, name, password } = req.body;
// //   const saltRounds = 10;

// //   console.log(">> New Postcreate usersss :", { email, name, password });
// //   // Validación simple
// //   if (!email || !name || !password) {
// //     return res.status(400).json({
// //       error: "Todos los campos son obligatorios: name, email, password",
// //     });
// //   }
// //   const hashPass = await bcrypt.hash(password, saltRounds);
// //   const query = `INSERT INTO users (name, email, password) VALUES ('${name}','${email}', '${hashPass}') RETURNING id, name, email, password`;
// //   // const query = `INSERT INTO users (name, email, password) VALUES ('${name}','${email}', '${hashPass}') `

// //   console.log(">>> query para insertar usersss", query);

// //   try {
// //     const result = await client.query(query);
// //     return res.status(200).json(result.rows[0]);
// //   } catch (error) {
// //     res.status(500).json({ error: "Error en el servidor" });
// //   }
// // });
// /* -------------------------------------------------------------------------- */




// Middleware para manejar rutas no existentes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en el puerto ${PORT}`);
});


// Probando el USERS / POST

