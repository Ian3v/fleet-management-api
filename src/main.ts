
import express,{ Application } from "express"
import { Client } from 'pg';

const app: Application = express();

const PORT: number = 666

app.use(express.json())



// Configuración de la base de datos
const client = new Client({
    host: 'localhost',
    database: 'db_taxis_1',
    user: 'root2',
    password: 'root2'
  });
  
  // Middleware para parsear JSON
  app.use(express.json());
  
  // Conectar a la base de datos
  client.connect()
    .then(() => console.log('Conectado a la base de datos 👽'))
    .catch(err => console.error('Error al conectar a la base de datos', err));
  
    // app.get('/greet', (req: Request, res: Response) => {
    //   res.send('Greetings!');
    // });

    app.get('/taxis', (req: Request, res: Response) => {
      // client.query('SELECT * FROM taxis t JOIN trajectories tr ON t.id = tr.taxi_id WHERE t.id = 10133; ')
      client.query('SELECT * FROM taxis')
      .then( result => res.json(result.rows))
      .catch(err => res.status(500).send('Error en el servidor'))
    });
    


    

// // Endpoint para obtener trayectorias con ID entre 10 y 20
// app.get('/trajectories', (req: Request, res: Response) => {
//   client.query('SELECT id, taxi_id FROM trajectories WHERE id > 15 AND id < 20')
//       .then(result => {
//         res.json(result.rows); // Envía los resultados como JSON
//         console.log(res.json(result.rows)); // Agrega esto para ver los resultados en la consola
//       })      
//       .catch(err => {
//           console.error('Error ejecutando la consulta', err);
//           res.status(500).send('Error en el servidor'); // Envía un error 500 en caso de fallo
//       });
// });

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en el puerto ${PORT}`);
});