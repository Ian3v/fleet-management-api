import { timeStamp } from "console";
import e from "express";
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


// http://localhost:666/taxis?page=1&limit=10
app.get("/taxis", async(req: Request, res: Response) => {

  const limit = parseInt(req.query.limit as string) || 10; // Registros por página, por defecto 10
  const page = parseInt(req.query.page as string) || 1; // Página actual, por defecto 1
  const plate = req.query.plate as string; // Captura el valor de plateParam (si existe)

  console.log('limit> ', limit);
  console.log('page> ',page);
  console.log('plate> ',plate);

  // const offset = (page - 1)* limit
  let query = `SELECT * FROM taxis`;

  if (plate) {
    query += ` WHERE plate LIKE '%${plate}'`; // Filtro por placa
  } 

  query += ` ORDER BY id LIMIT ${limit} OFFSET ${page}`;

  console.log('>>> ',query);

  try {
    const result = await client.query(query);
    res.json(result.rows); // Responde con los datos obtenidos
  } catch (err) {
    console.error('Error en el servidor:', err);
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


app.get(  "/trajectories", async(req:Request, res:Response) => {

  const taxiid = parseInt(req.query.taxiId as string);
  let date = req.query.date as string;
  
  // Fecha y formato
  if (date && date.includes('-')) {
    const parts = date.split('-');

    let yy = parseInt( parts[2])
    let mm = parseInt( parts[1])
    let dd = parseInt( parts[0])

    console.log('???????????????????', typeof(yy),' ',typeof( mm),' ',typeof( dd));

    if (parts[2].length === 4) {
        // Formato DD-MM-YYYY detectado
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;  // Convertimos a YYYY-MM-DD
    }
  }
  
  // let query = `SELECT * FROM trajectories WHERE taxi_id = ${taxiid} AND DATE(date) = '2008-02-02'`
  let query = ''
  if( !taxiid){

    return res.status(400).json({ message: 'responds with 400 for missing required parameters (taxiId)"' });
  }
  if(!date){
    return res.status(400).json({ message: 'Missing required parameter: date' });
  }else{
    
    query = `SELECT * FROM trajectories WHERE taxi_id = ${taxiid} AND DATE(date) = '${date}'`
  }
  // console.log('>>>>>> taxiid', taxiid);
  // console.log('>>>>>> date', date);
  // console.log('query', query);

  try{
    const result = await client.query(query)
    const resultRows = result.rows

    console.log('>>>>> Numeros de resultados de la consulta',resultRows.length);
    if(resultRows.length <= 0){
      return res.status(404).json({ message: 'Taxi not found' });
    }else{

      const resultFinal = resultRows.map( i => {
      
        return {
          taxiId: i.taxi_id,
          plate: i.plate,
          timestamp: i.date,
          latitude: i.latitude,
          longitude: i.longitude
        }
      })
      res.json(resultFinal); 
    }
  }catch(err) {
    console.error('Error en el servidor:', err);
    res.status(500).send("Error en el servidor"); // Manejo de errores
  }
  }
)


app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en el puerto ${PORT}`);
});
