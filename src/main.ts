import express, { Application,Response,Request } from "express";
import { Client } from "pg";

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

// MOStrar los 10 registros y con paginacion 


app.get("/taxis", (req: Request, res: Response) => {

  const pageParam = parseInt(req.query.page as string) || 1; // Página actual, por defecto 1
  const limitParam = parseInt(req.query.limit as string) || 10; // Registros por página, por defecto 10
 
  client
    .query(`SELECT * FROM taxis ORDER BY id LIMIT ${limitParam} OFFSET (${pageParam} - 1) * 10;`)
    .then((result) => res.json(result.rows))
    .catch((err) => res.status(500).send("Error en el servidor"));
});





app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en el puerto ${PORT}`);
});
