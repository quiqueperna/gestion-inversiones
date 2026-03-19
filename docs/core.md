Agrega funcionalidades para gestion, administracion, estadisticas, control de las inversiones.

Parti de la idea de operacion, definida en requeriments.

A partir de ahi vas a generar un conjunto de operaciones y a partir de su información vas a generar diferentes dashboard y estadisticas.

A tener en cuenta.
Un trade es cuando se da la apertura y cierre de una operacion. 
Para poder cerrar una operacion debo tener su contraparte en igual cantidad.
  - Ejemplo:
    - Compro 10 APPL a 100 (creo una operacion y esta en estado abierta).
    - Vendo 10 AAPL a 110, se cierra la operacion, y esto lo llamo Trade.

Puede ocurrir que abra varias operaciones sin tener contraparte, en ese caso quedan abiertas hasta que opere su contraparte.
  - Ejemplo:
      - Compro 10 APPL a 100 (creo una operacion y esta en estado abierta). 
      - Tengo 1 operacion abierta.
      - Compro 10 APPL a 100 (creo una operacion y esta en estado abierta).
      - Tengo 2 operaciones abierta.
      - Compro 10 APPL a 100 (creo una operacion y esta en estado abierta).
      - Tengo 3 operaciones abierta.
      - Vendo 10 APPL, puedo cerrar solo una operacion de compra de 10 APPL.

Existen varias estrategias para cerrar una operaciones. Si existe una sola operacion abierta y operamos la contraparte se cierra y listo, pero si existen varias operaciones abiertas para un mismo simbolo hay que elegir cual cerrar.

Se puede cerrar la mas vieja primero, la mas nueva primero, la que genere mejor rendimiento primero, etc.

Implementa una en la cual yo pueda elegir manualmente contra que operacion abierta puedo cerrar.

Genera listados de operaciones, es decir, todas las de compra y las operaciones de ventas.
Genera listados de trades (el conjunto de todas las operaciones cerradas).

Flujo: 
Investiga cuales son los dashboard y estadisticas mas buscados y armalos.
    Ej1: saldos (rendimientos) x un periodo x cuenta (dia, mes, año, todos).
    Ej2: mejores 5 trades, mejor mes, mayor rendimiento de un trade,  rendimientos por instrumentos (stocks, cedears, btc). 
    Ej3: Cantidad de operaciones abiertas, cerradas, positivas, negativas, promedio de size, vol x periodos.

    Busca muchos ejemplos, limitalo sino es infinito e implementalos

    
Cuandos las tengas definidas escribilas todos en un archivo "Funcionalidades.md"

Implementa todas esas funcionalidades.

Testea que todo funcione bien.

Arma un conjunto de datos para poder cargar operaciones cerradas y guardalas en un archivo CSV. 

Carga en memoria estos archivos y dejalo disponible de prueba para ver la información de todas las implementaciones. No lo pongas en BD porque no tengo instalado ahora.


