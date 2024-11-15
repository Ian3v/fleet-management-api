import { timeStamp } from "console";
import e from "express";
import express, { Application, Response, Request } from "express";
import { Client } from "pg";
import * as bcrypt from "bcrypt";
import { parse } from "path";

const app: Application = express();

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

// USERS
app.get("/users", async (req: Request, res: Response) => {
  let limit = req.query.limit;
  // let page = parseInt(req.query.page as string);
  let page = req.query.page as string;
  let query: string = "";
  // page === undefined || page === null
  console.log("#### Page ", page);
  console.log("#### limit", limit);

  if (limit || page) {
    //! Si exite alguno de estos
    console.log(">>> page", page);
    console.log(">>> limit ", limit);

    if (limit && !page) {
      //? Si pasa el if Me dara el resultado limite de 5
      if (!isNaN(limit) || limit > 0) {
        // limte es diferente de NaN o es mayor q 0
        query = `SELECT * FROM users
        ORDER  BY id LIMIT ${limit} OFFSET (1 - 1) * 10`;
        console.log("if paso >>> ", query);
        try {
          const result = await client.query(query);
          res.json(result.rows);
        } catch (err) {
          console.error("Error :", err);
        }
      } else {
        console.log("if NO PASO");
        return res.status(400).json({ error: "Invalid page LIMIT." });
      }
    }

    if (page && !limit) {
      console.log(">>> Hay PAge");
      let parsearPage = parseInt(page);
      if (isNaN(page)) {
        console.log("page es no un numero");
        return res.status(400).json({ error: "Invalid page page." });
      } else {
        query = `SELECT * FROM users
        ORDER  BY id LIMIT 10 OFFSET (${page} - 1) * 10`;
        console.log("else ocn page>>>", query);
        try {
          const result = await client.query(query);
          res.json(result.rows);
        } catch (err) {
          console.error("Error :", err);
        }
      }
    }
  } else {
    try {
      query = `SELECT * FROM users LIMIT 10`;
      console.log("#### ELSE");
      const result = await client.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Error :", err);
    }
  }
});

//INSERTAR USUARIOS
const insertUser = async (name: string, email: string, password: string) => {
  const saltRounds = 10;

  try {
    //Hasheamos la contrasenia usando bccrypt

    const hashPassword = await bcrypt.hash(password, saltRounds);
    console.log(">> ", password);
    console.log(">> ", hashPassword);
    //Insertar usuario
    const query = `INSERT INTO users (name, email, password) 
    VALUES ('${name}', '${email}', '${hashPassword}');`;
    console.log(">> ", query);
    return query;
  } catch (err) {
    console.error("Error :", err);
  }
};

// POST
app.post("/users", async (req: Request, res: Response) => {
  const { email, name, password } = req.body;
  console.log("POST /users", { email, name, password });

  // Validación simple
  if (!email || !name || !password) {
    return res
      .status(400)
      .json({
        error: "Todos los campos son obligatorios: name, email, password",
      });
  }

  // Verificar si el usurio ya existe
  const checkQuery = `SELECT * FROM users WHERE email = '${email}' OR name = '${name}';`;
  try {
    const checkresult = await client.query(checkQuery);

    if (checkresult.rows.length > 0) {
      //Usuario ya existe
      console.log("Ya existe users\n POST /checket ", checkresult.rows[0]);
      return res.status(409).json({ error: "El usuario ya EXISTE" });
    } else {
      //SI no entro al if, entonces no existe
      const query = `INSERT INTO users (name, email, password)
              VALUES ('${name}', '${email}', '${password}')
              RETURNING id, name, email;`;

     
      const result = await client.query(query);
      console.log("Usuario insertado:", result.rows[0]);
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.log("Errir en el servidor", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// PATCH
app.patch("/users/:id", async (req: Request, res: Response) => {
  const userId = req.params.id; 
  const { name, email } = req.body; // Campos que deseas actualizar

  console.log('> PATCH users/:id ', userId);
  console.log('> PATCH users/:id \n name, email ', name, ' ', email);

  
  // Verificar que al menos un campo se va a actualizar
  if (!name && !email) {
    return res.status(400).json({ error: "Se necesita al menos un campo para actualizar: name o email" });
  }

  // // Construir la consulta SQL dinámica
  // const updates = [];
  // if (name) updates.push(`name = '${name}'`);
  // if (email) updates.push(`email = '${email}'`);
  
  // const updateQuery = `UPDATE users SET ${updates.join(", ")} WHERE id = ${userId} RETURNING id, name, email`;

  // try {
  //   const result = await client.query(updateQuery);
  //   if (result.rows.length === 0) {
  //     return res.status(404).json({ error: "Usuario no encontrado" });
  //   }
  //   res.status(200).json(result.rows[0]);
  // } catch (err) {
  //   console.error("Error en el servidor:", err);
  //   res.status(500).json({ error: "Error en el servidor" });
  // }
});




app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en el puerto ${PORT}`);
});
