Agrega funcionalidades para gestion, administracion, estadisticas, control de las inversiones.

Parti de la idea de operacion y de trade, definida en requeriments.

A partir de ahi vas a generar un conjunto de operaciones y a partir de su información vas a generar diferentes dashboard y estadisticas.

A tener en cuenta.
Un trade es cuando se da la apertura y cierre de una operacion. 
Para poder cerrar un trade debo tener su contraparte en igual cantidad.
  - Ejemplo:
    - Compro 10 APPL a 100 (creo un trade de tipo compra y esta en estado abierto).
    - Vendo 10 AAPL a 110, se cierra el trade.

Puede ocurrir que abra varios trades sin tener contraparte, en ese caso quedan abiertos hasta que opere su contraparte.
  - Ejemplo:
      - Compro 10 APPL a 100 (creo un trade y esta en estado abierto). 
      - Tengo 1 trade abierto.
      - Compro 10 APPL a 100 (creo un trade y esta en estado abierto).
      - Tengo 2 trade abiertos.
      - Compro 10 APPL a 100 (creo un trade y esta en estado abierto).
      - Tengo 3 trade abiertos.
      - Vendo 10 APPL, puedo cerrar solo un trade de compra de 10 APPL.

Existen varias estrategias para cerrar un trade. Si existe un sola trade abierta y operamos la contraparte se cierra y listo, pero si existen varios trades abiertos para un mismo simbolo hay que elegir cual cerrar.

Se puede cerrar el mas viejo primero, el mas nuevo primero, el que genere mejor rendimiento primero, etc.

Implementa una estrategia en la cual yo pueda elegir manualmente contra que trade abierto puedo cerrar.

Genera listados de operaciones, es decir, todas las de compra y las operaciones de ventas con todos sus campos tanto en back como en front
Genera listados de trades con todos sus campos tanto en back como en front

Flujo: 
Investiga cuales son los dashboard y estadisticas mas buscados y armalos.
    Ej1: saldos (rendimientos) x un periodo x cuenta (dia, mes, año, todos).
    Ej2: mejores 5 trades, mejor mes, mayor rendimiento de un trade,  rendimientos por instrumentos (stocks, cedears, btc). 
    Ej3: Cantidad de operaciones abiertas, cerradas, positivas, negativas, promedio de size, vol x periodos.

    Busca muchos ejemplos, limitalo sino es infinito e implementalos

    
Cuandos las tengas las ideas de dashboard y estadisticas definidas escribilas todos en un archivo "Funcionalidades.md"

Implementa todas esas funcionalidades.

Testea que todo funcione bien.

Arma un conjunto de datos de 100 trades y guardalas en un archivo CSV con fechas en un rango de 2 años. 
Carga trades que hayan quedado abiertos porque hay operaciones acumuladas y sin contraparte. 

Carga en memoria estos trades y dejalo disponible de prueba para ver la información de todas las implementaciones. No lo pongas en BD porque no tengo instalado ahora.


