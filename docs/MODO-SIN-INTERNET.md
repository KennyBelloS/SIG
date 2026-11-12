# Modo sin internet

## Qué sí cubre
- **Abrir la aplicación sin internet** (si ya la habías abierto antes con conexión): un «service worker» (`public/sw.js`) guarda en el propio equipo la aplicación y lo último que se consultó de Supabase.
- **Ver lo último que se cargó** de Matriz, Indicadores, Dashboard, etc. (puede no ser lo más reciente si alguien más registró algo después de tu última visita con internet).
- **Registrar el valor mensual de un indicador** (la pantalla de la ficha de cada indicador, el formulario con el valor, el análisis y el plan de acción): si no hay internet, el registro se guarda en el equipo y se envía solo en cuanto vuelva la señal. Mientras tanto, se ve en la pantalla con un aviso de «pendiente».
- **Choques**: si mientras no tenías internet, alguien más (desde otro equipo, con conexión) registró un valor distinto para ese mismo indicador y mes, al recuperar la señal NO se sobrescribe en silencio — aparece un aviso para decidir cuál de los dos se queda.

## Qué NO cubre (todavía)
A propósito, por ahora el "sin internet" es solo para **registrar el valor de un indicador** (lo más importante del día a día). Lo siguiente sigue necesitando conexión:
- Crear o quitar usuarios, cambiar configuración, importar Excel.
- Cerrar/reabrir meses, enviar correos, crear indicadores nuevos.
- Iniciar sesión por primera vez (para entrar sí hace falta internet la primera vez; después de eso, mientras la sesión siga abierta, puede seguir usándose sin conexión).

Si más adelante quieres que alguna de estas otras acciones también funcione sin internet, se puede agregar siguiendo el mismo patrón (la cola en `src/lib/offline.js`).

## Cómo probarlo
1. Publica esta versión (sigue siendo necesario desplegarla, como con cualquier otro cambio).
2. Abre la aplicación con internet, entra a un indicador (para que quede guardado en el equipo).
3. Activa el modo avión del celular, o en el computador desconecta el wifi.
4. Recarga la página: debería seguir abriendo.
5. Registra un valor: debe avisar «guardado en este equipo, se enviará solo».
6. Vuelve a conectar internet: en menos de un minuto debería desaparecer el aviso de pendiente (se revisa solo al recuperar conexión, y de refuerzo cada minuto).

## Un límite importante
Esto no lo pude probar yo mismo con una conexión real desconectándose de verdad (en este chat no hay forma de simular eso), así que lo primero que hagas en la prueba real importa mucho: si algo no se comporta como se describe arriba, cuéntame exactamente qué paso del «Cómo probarlo» falló y lo ajusto.
