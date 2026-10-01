const manualURL = 'https://notebook.zoeblade.com/Downloads/Documentation/Casio/CZ-101_owners_manual.pdf';

// Original explanations and workshop suggestions, checked against the CZ-101
// operation manual's PD, parameter and envelope sections.
const help = {
  history: ['Undo / Redo · explorar sin perder el camino',
    'El historial sigue los cambios de parámetros del patch actual: nombre, destino, líneas, ondas, modulación y envolventes. Cada gesto de arrastre y cada cambio confirmado de una envolvente es un paso. La escritura continua de un campo se agrupa para evitar deshacer letra por letra.',
    'Undo recupera el paso anterior; Redo lo vuelve a aplicar. Si deshacés y después cambiás un parámetro, comenzás una rama nueva y se descarta el camino de Redo. Cada patch mantiene su propio historial durante esta sesión, con hasta 100 pasos.',
    'Los valores recuperados se guardan como cualquier edición normal. El historial, en cambio, es temporal: se reinicia al recargar o importar una biblioteca. No incluye New, Duplicate, Delete ni Import; exportá JSON para conservar una copia de tu biblioteca.',
    'Podés usar Ctrl/Cmd+Z y Ctrl/Cmd+Shift+Z (o Ctrl+Y) con el foco fuera de los campos. Dentro de un input se conserva el Undo nativo de escritura. El historial del patch sólo se usa en B, la versión editable.'],
  comparison: ['A / B · conservar una referencia y escuchar la diferencia',
    'B es el patch de trabajo que se guarda en la biblioteca. B → A toma una copia de ese momento como referencia temporal. Después podés seguir tallando B y alternar con A sin duplicar patches ni perder los cambios de B.',
    'A se muestra en modo de sólo lectura: los campos y nodos quedan bloqueados. B vuelve a habilitar la edición. Si la preescucha está sonando, cambiar de versión dispara otra vez la nota para comparar el ataque completo. Ambas versiones usan la misma base y volumen de preescucha.',
    'Send to CZ transmite la versión visible; en A el botón dice Send A to CZ. El destino de esa versión aparece en su selector, y una escritura INTERNAL conserva su confirmación habitual. Cambiar A/B no envía MIDI automáticamente. Export JSON y Send ALL usan los patches de trabajo B guardados, no las referencias temporales.',
    'Para actualizar la referencia, volvé a B y pulsá B → A otra vez. Esto reemplaza la referencia anterior de ese patch. A y el historial viven sólo durante la sesión: se pierden al recargar o importar. Si querés conservar una variante de forma permanente, duplicá el patch estando en B.'],
  preview: ['PD Preview · un banco de pruebas para las envolventes',
    'Esta primera preescucha genera audio en el navegador. No necesita una conexión MIDI ni transmite al CZ. Es monofónica y escucha una sola línea. En modos con dos líneas podés elegir cuál estudiar, pero todavía no las mezcla.',
    'Wave 1 del patch utiliza su primera forma si es 1 o 2. Las bases Saw y Square permiten escuchar las mismas envolventes sobre una referencia sin modificar las ondas guardadas. Las formas 3–8, Wave 2, Key Follow, Detune, Vibrato y Ring/Noise quedan fuera de esta primera versión.',
    'Play dispara la nota y puede volver a dispararla para comparar ataques. La nota queda sostenida hasta Release, que permite escuchar la liberación. Si DCA no tiene sustain, su gesto puede terminar solo. Stop corta el sonido con un fundido corto. También se detiene al cambiar de patch o salir de la ventana. Hay un límite de un minuto por nota.',
    'Las casillas sólo omiten envolventes en la preescucha: DCO omitida conserva la altura de la nota base; DCW omitida mantiene la forma PD plenamente desarrollada; DCA omitida mantiene un volumen constante hasta Release. Así podés comparar el aporte de cada movimiento. No cambian los parámetros del patch.',
    'Probá primero DCO omitida, DCA sostenida y una caída de DCW. Después compará con DCW omitida. Para estudiar el volumen, omití DCO y DCW y concentráte en DCA. Para el pitch, sostené el volumen y variá sólo DCO. Elegí Play nuevamente si querés escuchar un cambio desde el ataque.',
    'Los tiempos, las curvas de lectura PD y la escala de pitch son aproximaciones didácticas, no mediciones del hardware. Octave sí traslada la nota base. El número de Level en DCO no equivale aquí a una cantidad exacta de semitonos del CZ. Usá la preescucha para explorar gestos y comprobá el resultado final en el instrumento.'],
  line: ['Una línea: tres herramientas para tallar el sonido',
    'Pensá cada línea como una voz con tres movimientos independientes: DCO dibuja la altura, DCW dibuja el color y DCA dibuja el volumen. Sus envolventes avanzan durante la misma nota, pero pueden tener ritmos y puntos de sustain distintos.',
    'Para escuchar qué aporta cada herramienta, trabajá primero con una sola línea. Mantené estable la afinación, dejá audible el volumen y mové únicamente DCW. Después probá un ataque de pitch y, por último, ajustá cuánto dura el sonido. Cambiar una dimensión por vez facilita encontrar el gesto que buscás.',
    'Una segunda línea permite contrastes: un cuerpo oscuro y sostenido junto a un ataque breve y brillante; dos colores parecidos ligeramente desafinados; o una capa que aparece después de la otra. Line Select decide qué líneas se oyen.'],
  waves: ['Wave 1 / Wave 2 · el material del motor PD',
    'El CZ no reproduce grabaciones PCM de instrumentos. Parte de una senoide/cosenoide en ROM. La distorsión de fase altera la velocidad con que recorre ese ciclo: algunos tramos se comprimen y otros se estiran. Así aparece una forma más compleja y cambia su contenido armónico.',
    'Wave 1 y Wave 2 eligen el patrón de esa transformación. Con Wave 2 en Off se usa sólo la primera forma. Si activás la segunda, se reproducen una a continuación de la otra dentro de una secuencia repetida: no son dos osciladores mezclados ni una onda que modula a la otra. Las dos comparten las envolventes de esta línea.',
    'DCW determina cuánto se manifiesta ese carácter. Para comparar las formas, empezá con Wave 2 en Off, DCO estable y DCW alto. Luego bajá DCW y escuchá el recorrido hasta un sonido más puro. Recién después agregá Wave 2 y compará la combinación con cada forma sola.',
    'El CZ permite combinar las formas ordinarias con una resonante, pero no dos resonantes entre sí (6, 7 u 8). El selector muestra todas las opciones; elegí una pareja compatible con el instrumento.'],
  reference: ['Las ocho formas · un mapa para el oído',
    '1: Sawtooth (diente de sierra). 2: Square (cuadrada). 3: Pulse (pulso). 4: Double Sine (doble seno). 5: Saw-Pulse. 6: Resonance I (saw). 7: Resonance II (triangle). 8: Resonance III (trapezoid). Los dibujos son referencias del panel: no muestran la onda instantánea para el nivel actual de DCW.',
    'Usá las formas como puntos de partida, no como etiquetas rígidas de instrumentos. Probá 1 para un cuerpo brillante; 2 o 3 para un carácter hueco o incisivo; 4 y 5 para texturas menos obvias. Con 6–8, una caída de DCW puede dar un gesto vocal o resonante muy marcado.',
    'Compará siempre a un volumen parecido: una forma que parece mejor puede ser simplemente más intensa. Repetí la comparación en graves y agudos, y con DCW bajo, medio y alto. El borde dorado señala Wave 1; el otro contorno señala Wave 2.'],
  dco: ['DCO envelope · la trayectoria de la altura',
    'Esta envolvente controla pitch, no volumen. Cada L es un destino de altura y cada R indica qué tan rápido se alcanza. El nivel 0 es la referencia de la nota; los niveles mayores elevan la afinación. La escala no equivale a semitonos ni a cents: no interpretes L=50 como una posición neutra.',
    'Para una nota afinada y estable, mantené los niveles de la parte sostenida en 0. Para un ataque percusivo, probá un primer punto elevado y rápido, seguido de una caída rápida hacia 0. Escuchá cómo un gesto pequeño puede sugerir una cuerda golpeada, y uno exagerado puede convertirse en un tom o un efecto electrónico.',
    'Para un ascenso, partí de un nivel bajo y llegá a uno mayor con un R moderado. Para un descenso, hacé primero una subida muy rápida al nivel inicial y después bajá. Si el nivel sostenido queda elevado, la nota seguirá desplazada durante el sustain; revisalo antes de tocar acordes.',
    'El último punto E vuelve a nivel 0 en el CZ. Coordiná la liberación de DCO con DCA: una caída de pitch puede quedar oculta si el volumen desaparece antes, o ser muy evidente si la cola sigue sonando.'],
  dcw: ['DCW envelope · esculpir el timbre con PD',
    'DCW controla la evolución de la distorsión de fase. En las formas no resonantes, L=0 produce una onda senoidal y L=99 expresa la forma seleccionada. Los niveles intermedios exploran ese recorrido. Se parece al gesto de abrir y cerrar un filtro, aunque aquí se transforma la generación de la onda.',
    'Las formas resonantes 6–8 tienen un comportamiento especial: al recorrer DCW se desplaza su carácter resonante. No conviene pensar sólo en “más o menos brillo”; escuchá también dónde aparece el énfasis y cómo cambia el color.',
    'Para un bajo con ataque, arrancá con un nivel alto y caé rápidamente a uno más bajo sostenido. Para un pad que florece, hacé que DCW suba lentamente mientras DCA ya deja oír la nota. Para un acento tipo wah, probá varios puntos que suban y bajen antes del sustain.',
    'DCA puede sostener el volumen mientras DCW se oscurece: así el sonido sigue presente pero se vuelve menos agresivo. También podés hacer el movimiento inverso, aumentando el brillo mientras baja el volumen. Probá cambios de una sola etapa y compará con la envolvente anterior.'],
  dca: ['DCA envelope · el gesto del volumen',
    'DCA controla amplitud. L=0 es silencio; los niveles mayores dejan pasar más sonido. Un ataque rápido da presencia inmediata, uno lento suaviza la entrada. La cola después de soltar la tecla depende de las etapas que siguen al sustain y terminan en E.',
    'Para un pluck, probá un primer nivel alto con R rápido y una caída hacia silencio. Sin sustain, el gesto puede completar su recorrido aunque mantengas la tecla. Para una nota que debe durar mientras la sostenés, elegí un punto S audible y dejá después una etapa de liberación hacia 0.',
    'Para cuerdas o pads, explorá un ataque más lento y una cola moderada. Para órgano, una subida inmediata, sustain estable y liberación breve. Para un golpe con rebote, usá más de una caída y subida de nivel antes del final, escuchando si el segundo impulso realmente aporta algo.',
    'Esta envolvente decide cuánto se oyen los movimientos de DCO y DCW. Si un cambio de pitch o de color parece no funcionar, comprobá que todavía haya volumen cuando ocurre. El punto E llega a silencio en el hardware; para que la intención sea clara, dibujalo también con L=0.'],
  rate: ['R · velocidad de llegada al nivel de esta etapa',
    'Rate es velocidad, no duración: un valor mayor hace más rápida la transición hacia el L de esa fila. Ese segmento parte del nivel anterior; al comenzar la nota, parte del nivel inicial de la envolvente. El tiempo audible depende también de la distancia que debe recorrer.',
    'No hay una equivalencia general “R=50 son tantos milisegundos”. Compará el gesto escuchando el CZ. Si querés preservar la forma pero hacer el ataque más lento, empezá reduciendo sólo el R de la primera etapa. Si querés cambiar la cola, trabajá los R posteriores al sustain.',
    'En el gráfico, arrastrar hacia la derecha reduce Rate y hacia la izquierda lo aumenta. El eje horizontal ofrece una representación aproximada y relativa: no es una medición del tiempo real del sintetizador.'],
  level: ['L · el destino de cada etapa',
    'Level es el valor al que llega esa etapa, no su duración. Su significado depende del editor: DCO = altura, DCW = carácter de la onda y DCA = volumen. Dos envolventes con el mismo dibujo pueden, por eso, producir efectos completamente distintos.',
    'Preguntate qué querés escuchar en cada punto: ataque, cuerpo, sostenimiento y liberación. Fijá primero esos destinos con L y ajustá después la velocidad con R. Así es más fácil separar la forma del gesto de su timing.',
    'Arrastrar un nodo verticalmente cambia L. En el punto E, el CZ termina a nivel 0; conviene mantener el último nivel en 0 para que el dibujo represente claramente ese final.'],
  sustain: ['S · un punto de espera, no un loop',
    'Puede haber un único punto Sustain en cada envolvente. Al llegar a él, la envolvente mantiene ese nivel mientras la tecla sigue sostenida. Al soltarla, entra en la parte de liberación que conduce al final. Sustain no repite las etapas anteriores.',
    'En este editor, tocar el S que ya está seleccionado lo elimina. Sin S, la envolvente recorre su gesto sin quedarse esperando: es útil para golpes, campanas y plucks. Un S en DCA puede sostener volumen, mientras otro S en DCW sostiene un color distinto.',
    'No hace falta ubicar S en la misma etapa en los tres editores. Probá dejar DCA estable mientras DCW tarda más en alcanzar su color final. Dejá etapas después de S cuando necesites una cola audible.'],
  end: ['E · dónde termina la envolvente',
    'End elige la última etapa activa, de 1 a 8. Sólo puede haber un E. Las filas posteriores quedan inactivas: podés conservar sus valores para explorar después una envolvente más larga, pero no forman parte del recorrido actual.',
    'El CZ termina esa etapa en nivel 0. En DCA es el silencio final; en DCO vuelve a la referencia de altura; en DCW vuelve al extremo inferior de su recorrido. El R de esa etapa ayuda a definir la llegada al final.',
    'Para una forma simple no necesitás los ocho puntos. Empezá con pocos y agregá uno sólo cuando quieras un cambio de dirección, un segundo acento o una liberación más elaborada.'],
  dcwFollow: ['DCW Key Follow · adaptar el color al registro',
    'Con un rango mayor, las notas más agudas se acercan más a una onda senoidal: disminuye su complejidad armónica. 0 desactiva este seguimiento; 1–9 aumentan su efecto. Trabaja junto a DCW, no reemplaza su envolvente.',
    'Pensalo como una manera de equilibrar el teclado. Un bajo puede tener un cuerpo atractivo abajo y resultar demasiado cortante arriba. Un poco de seguimiento puede conservar el peso en graves y suavizar los agudos.',
    'Probalo tocando la misma figura en varias octavas, primero con 0 y después con valores pequeños. Si los agudos pierden demasiado carácter, reducí el rango o revisá el nivel sostenido de DCW. Si buscás un sonido uniforme o deliberadamente incisivo en todo el teclado, empezá sin seguimiento.'],
  dcaFollow: ['DCA Key Follow · adaptar la duración al registro',
    'Aquí el seguimiento acorta la envolvente de volumen cuanto más aguda es la nota. No es un control de volumen por nota. 0 deja la duración sin ese seguimiento; valores mayores refuerzan el contraste temporal entre graves y agudos.',
    'Es una herramienta útil para sugerir instrumentos de cuerda golpeada o pulsada. Probá un bajo con una cola más larga abajo y un ataque más breve arriba. Escuchá un arpegio amplio para decidir si el registro agudo se libera con naturalidad o queda demasiado seco.',
    'Diseñá primero DCA con el seguimiento en 0. Después agregalo y comprobá ataques y colas en ambos extremos del teclado. Para un pad que debe respirar de forma parecida en todas las notas, probablemente prefieras poco o ningún seguimiento.'],
  modulation: ['Modulation · interacción entre líneas',
    'None conserva el carácter de las líneas sin Ring ni Noise. Ring multiplica las señales y genera componentes de suma y diferencia: la relación de afinación cambia profundamente el resultado. Para Ring usá Line 1 + Line 1′ o Line 1 + Line 2′.',
    'Noise introduce una textura irregular mediante modulación por ruido. Ring y Noise son alternativas, no dos efectos simultáneos. No confundas esta sección con DCW: PD transforma la forma de cada línea; aquí elegís otra interacción sonora.',
    'Para una campana, probá Ring con una relación de afinación clara y una DCA que decaiga. Cambiá Note u Oct del Detune antes de tocar Fine y escuchá qué relaciones dan un metal afinado y cuáles un clangor más extraño. Una envolvente de pitch breve puede agregar un golpe inicial.',
    'Para percusión o ataques rugosos, probá Noise con una DCA corta. Aislá el gesto: volumen breve, poco vibrato y una forma simple. Luego alargá la cola o mové DCW para decidir cuánto cuerpo tonal querés conservar.'],
  lineSelect: ['Line Select · elegir la arquitectura del patch',
    'Line 1 y Line 2 usan una línea sola. Line 1 + Line 1′ combina la primera con una versión desafinada de ella. Line 1 + Line 2′ combina la primera con la segunda desafinada; el símbolo prima (′) indica la ruta afectada por Detune.',
    'Para engrosar un solo color, explorá 1 + 1′ con Fine pequeño. Para combinar ataque y cuerpo diferentes, elegí 1 + 2′ y diseñá cada línea por separado. En el CZ-101, usar dos líneas reduce la polifonía disponible de ocho a cuatro notas.',
    'El editor muestra las tarjetas que necesita el modo elegido. Ocultar una línea no borra sus parámetros: podés volver a ella. Si cambiás de una línea sola a una combinación, revisá Detune y Modulation para entender de dónde viene el nuevo carácter.'],
  octave: ['Octave · trasladar todo el patch',
    'Desplaza el registro general una octava abajo, sin cambio, o una octava arriba. Es una decisión de registro del patch completo; Detune, en cambio, define la diferencia entre las rutas combinadas.',
    'Probá el sonido en el registro donde se va a usar. Una textura convincente como bajo puede ser áspera como lead, y un pad puede ganar claridad al subirlo. Después de trasladarlo, revisá Key Follow: el equilibrio de brillo y duración también merece una nueva escucha.'],
  detune: ['Detune · espesor, intervalos y batimientos',
    'Desplaza la afinación de la ruta marcada con prima (1′ o 2′). Direction elige el sentido; Oct y Note el intervalo grueso; Fine el ajuste pequeño. Para escuchar esa diferencia, usá un modo combinado en Line Select.',
    'Con Oct=0 y Note=0, probá subir Fine de a poco: la cercanía de las dos alturas puede producir batimientos y una sensación de coro. Si exagerás, el sonido deja de sentirse simplemente ancho y se perciben dos afinaciones.',
    'Con Note u Oct podés construir un intervalo en vez de un unísono. Probá una octava para reforzar el registro, o un intervalo elegido al oído para crear una identidad más armónica. Con Ring, esas relaciones se vuelven parte central del timbre.',
    'Para evaluar Detune sin confundirlo con movimiento, bajá temporalmente Vibrato Depth a 0 y usá envolventes DCO estables. Después reintroducí las otras modulaciones.'],
  direction: ['Direction · subir o bajar la ruta desafinada',
    '+ desplaza la ruta prima hacia arriba; − la desplaza hacia abajo. Afecta el desplazamiento definido por Oct, Note y Fine. Con los tres en 0, cambiar el signo no crea una diferencia de afinación.',
    'Para un coro suave, compará ambos sentidos con Fine pequeño y el mismo registro. Para un intervalo grande, elegí también qué voz querés que ocupe el grave: la elección cambia el peso del sonido aunque el intervalo relativo sea similar.'],
  detuneOct: ['Detune Oct · diferencia en octavas',
    'Define el componente de octavas del desplazamiento, de 0 a 3; Direction decide hacia dónde. Se suma al intervalo de Note y al ajuste Fine. No traslada ambas rutas como el Octave general.',
    'Una octava puede sumar fundamento o brillo. Probá primero ambas líneas con un volumen parecido y después ajustá sus DCA para que una sostenga el cuerpo y la otra aporte sólo un acento. Con Ring, volvé a evaluar el color al cambiar este intervalo.'],
  detuneNote: ['Detune Note · diferencia en semitonos',
    'Añade de 0 a 11 semitonos al desplazamiento de la ruta prima, en el sentido de Direction. Note=0 conserva el unísono si Oct y Fine también están en 0.',
    'Un intervalo fijo forma parte del patch y acompaña cada tecla que toques. Antes de usarlo en acordes, probá cómo se combina con la armonía. Para un cuerpo en unísono usá 0; para un carácter de intervalo elegí Note por su sonido, no sólo por el número.'],
  fine: ['Detune Fine · ajuste pequeño y batimientos',
    'Ajusta finamente la diferencia de altura en la escala 0–60 del CZ. El número es una unidad del parámetro; no lo leas directamente como cents. Direction determina el sentido.',
    'Empezá con valores pequeños y una nota larga. Buscá el punto donde el sonido respira sin volverse una desafinación evidente. Probá también acordes: un ajuste agradable en una sola nota puede hacer demasiado movimiento en una textura densa.',
    'No es vibrato: Fine establece una diferencia de afinación entre las rutas, mientras Vibrato mueve la altura con el tiempo. La combinación puede ser expresiva, pero escuchá cada herramienta por separado antes de sumarlas.'],
  vibrato: ['Vibrato · movimiento periódico de altura',
    'Vibrato modula pitch. Wave define el gesto, Delay su espera, Rate su velocidad y Depth su amplitud. No es tremolo de volumen ni un LFO asignable a DCW. Para escucharlo, el efecto Vibrato también debe estar habilitado en el CZ.',
    'Para una nota expresiva, probá triángulo, poca profundidad y una espera que deje el ataque quieto. Para un efecto sintético, explorá las rampas o la cuadrada con mayor profundidad. El movimiento debe acompañar el sonido: no todos los ataques necesitan vibrar desde el primer instante.',
    'Ajustá primero Depth para encontrar la intensidad, después Rate para el ritmo y por último Delay para la entrada. Compará con Depth=0: esa referencia te permite escuchar si el movimiento aporta vida o esconde la identidad del patch.'],
  vibWave: ['Vibrato Wave · la forma del movimiento',
    '1 = Triangle: subida y bajada continuas. 2 = Saw Up: rampa ascendente con retorno abrupto. 3 = Saw Down: rampa descendente con retorno abrupto. 4 = Square: alternancia entre dos niveles de altura.',
    'Esta Wave es la forma del modulador de pitch, no Wave 1/Wave 2 del oscilador audible. El triángulo suele ser un buen comienzo para un vibrato discreto; las rampas sugieren un gesto repetido y la cuadrada puede dar una alternancia marcada de dos alturas.',
    'Para comparar sin que la intensidad domine la decisión, mantené Rate y Depth iguales al cambiar Wave. Después adaptalos al carácter que elegiste.'],
  delay: ['Vibrato Delay · dejar respirar el ataque',
    'Define cuánto tarda en comenzar el vibrato después de pulsar la tecla. Mayor valor significa mayor espera; 0 permite una entrada inmediata. La escala 0–99 es un parámetro del CZ, no milisegundos.',
    'Un poco de espera puede hacer que un lead primero articule la nota y después cobre movimiento. Para un ataque percusivo breve, una espera larga puede dejar el vibrato prácticamente fuera de lo audible. Probá notas cortas y largas para comprobar ambas situaciones.'],
  vibRate: ['Vibrato Rate · velocidad de oscilación',
    'Mayor Rate significa ciclos más rápidos. La escala 0–99 no se muestra en Hz. A diferencia de Delay, cambia la velocidad del movimiento una vez que está activo.',
    'Escuchá si buscás una ondulación lenta, un vibrato de fraseo o un temblor rápido. Probá la misma velocidad con poca y mucha Depth: la percepción del gesto cambia. Si el resultado es demasiado agitado, bajá primero Depth para decidir si el problema es intensidad o velocidad.'],
  depth: ['Vibrato Depth · amplitud del movimiento',
    'Determina cuánto varía la altura; 0 elimina esa variación. Los valores mayores hacen el movimiento más evidente. No cambia el volumen ni mide la profundidad de PD.',
    'Para una sutileza expresiva, arrancá en 0 y subí hasta que el movimiento sea apenas perceptible. Para un efecto de dos alturas con Wave 4, explorá una profundidad más grande y ajustá Rate al ritmo que buscás. Revisá los acordes y las notas largas: son donde más se revela una profundidad excesiva.'],
  destination: ['Destination · dónde escuchar o guardar el patch',
    'Edit buffer envía al sonido actual para probar el patch. Internal 1–16 escribe el slot elegido cuando pulsás Send to CZ, después de la confirmación. Para esa escritura, MEMORY PROTECT debe estar OFF.',
    'Asignar un destino en el librarian sólo guarda esa elección con el patch; no transmite automáticamente. Mientras explorás variaciones, Edit buffer facilita comparar sin ir escribiendo un slot. Asigná INTERNAL cuando hayas decidido dónde guardar el resultado.',
    'Send ALL patches incluye únicamente destinos INTERNAL válidos, pide una confirmación del lote y envía en orden de slot. No puede empezar si dos patches apuntan al mismo slot. Su progreso refleja los envíos; no confirma la recepción del CZ.']
};

let dismissDetached = () => {};

export function enhanceHelp(root = document) {
  dismissDetached();
  root.querySelectorAll('[data-help]:not([data-help-hover-only])').forEach(target => {
    if (!help[target.dataset.help] || target.querySelector('.help-trigger')) return;
    const trigger = document.createElement('span');
    trigger.className = 'help-trigger';
    trigger.textContent = '?';
    trigger.setAttribute('role', 'button');
    trigger.tabIndex = 0;
    trigger.setAttribute('aria-label', `Ayuda: ${help[target.dataset.help][0]}`);
    trigger.setAttribute('aria-controls', 'sound-help');
    trigger.setAttribute('aria-expanded', 'false');
    const caption = document.createElement('span');
    caption.className = 'help-caption';
    const text = [...target.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
    if (text) {
      target.insertBefore(caption, text);
      caption.append(text);
    } else target.prepend(caption);
    caption.append(trigger);
  });
}

export function initHelp() {
  const staticTargets = {
    '#destination': 'destination', '#lineSelect': 'lineSelect', '#octave': 'octave',
    '#detuneDirection': 'direction', '#detuneOctave': 'detuneOct', '#detuneNote': 'detuneNote', '#detuneFine': 'fine',
    '#vibWave': 'vibWave', '#vibDelay': 'delay', '#vibRate': 'vibRate', '#vibDepth': 'depth'
  };
  Object.entries(staticTargets).forEach(([selector, key]) => {
    const control = document.querySelector(selector);
    const label = control.closest('label') || control.parentElement.querySelector('label');
    label.dataset.help = key;
  });
  document.querySelectorAll('.parameter-row .compact h2').forEach(heading => {
    heading.dataset.help = heading.textContent === 'Detune' ? 'detune' : 'vibrato';
  });

  const panel = document.createElement('aside');
  panel.id = 'sound-help';
  panel.className = 'sound-help';
  panel.hidden = true;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'sound-help-title');
  panel.innerHTML = '<div class="sound-help-head"><h4 id="sound-help-title"></h4><button type="button" class="help-close" aria-label="Cerrar ayuda">×</button></div><div class="sound-help-body" tabindex="0" aria-label="Contenido de la ayuda"></div><footer>Hover para explorar · clic en ? para fijar · Esc para cerrar</footer>';
  document.body.append(panel);
  let anchor = null;
  let pinned = false;
  let timer;
  let restoringFocus = false;

  function hide(restoreFocus = false) {
    clearTimeout(timer);
    const trigger = anchor?.querySelector('.help-trigger');
    const restore = restoreFocus && panel.contains(document.activeElement);
    trigger?.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    pinned = false;
    anchor = null;
    if (restore) {
      restoringFocus = true;
      trigger?.focus({ preventScroll: true });
      restoringFocus = false;
    }
  }

  function position() {
    if (!anchor?.isConnected) return hide();
    const rect = anchor.getBoundingClientRect();
    const margin = 12;
    const above = Math.max(0, Math.min(rect.top, window.innerHeight - margin) - margin - 8);
    const below = Math.max(0, window.innerHeight - margin - Math.max(margin, rect.bottom) - 8);
    const useBelow = below >= above;
    panel.style.maxHeight = `${Math.min(650, window.innerHeight - 24, Math.max(160, useBelow ? below : above))}px`;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const preferredTop = useBelow ? rect.bottom + 8 : rect.top - 8 - height;
    const top = Math.max(margin, Math.min(preferredTop, window.innerHeight - height - margin));
    panel.style.top = `${top}px`;
    panel.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
  }

  function show(target, pin = false) {
    clearTimeout(timer);
    if (!help[target.dataset.help]) return;
    if (anchor !== target) {
      anchor?.querySelector('.help-trigger')?.setAttribute('aria-expanded', 'false');
      const [title, ...paragraphs] = help[target.dataset.help];
      panel.querySelector('h4').textContent = title;
      const body = panel.querySelector('.sound-help-body');
      body.replaceChildren(...paragraphs.map(text => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        return paragraph;
      }));
      if (['dco', 'dcw', 'dca'].includes(target.dataset.help)) {
        for (const key of ['rate', 'level', 'sustain', 'end']) {
          const [subtitle, ...details] = help[key];
          const heading = document.createElement('h5');
          heading.textContent = subtitle;
          body.append(heading);
          details.forEach(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            body.append(paragraph);
          });
        }
      }
      if (target.dataset.help !== 'destination') {
        const link = document.createElement('a');
        link.href = manualURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Consultar el manual original del CZ-101';
        body.append(link);
      }
      body.scrollTop = 0;
    }
    anchor = target;
    pinned = pin;
    panel.hidden = false;
    target.querySelector('.help-trigger')?.setAttribute('aria-expanded', 'true');
    position();
  }

  function scheduleHide() {
    clearTimeout(timer);
    if (!pinned) timer = setTimeout(() => hide(), 350);
  }

  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    if (panel.contains(event.target)) return clearTimeout(timer);
    const target = event.target.closest('[data-help]');
    if (!target || target.contains(event.relatedTarget) || pinned) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(target), 300);
  });
  document.addEventListener('pointerout', event => {
    const target = event.target.closest('[data-help]');
    if (target && !target.contains(event.relatedTarget)) scheduleHide();
  });
  panel.addEventListener('pointerleave', scheduleHide);
  document.addEventListener('focusin', event => {
    if (event.target.matches('.help-trigger') && !pinned && !restoringFocus) show(event.target.closest('[data-help]'));
  });
  document.addEventListener('focusout', event => {
    if ((event.target.matches('.help-trigger') || panel.contains(event.target)) &&
        !panel.contains(event.relatedTarget) && !anchor?.contains(event.relatedTarget)) scheduleHide();
  });
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.help-trigger');
    if (trigger) {
      event.preventDefault(); // Help inside a label must not activate its control.
      const target = trigger.closest('[data-help]');
      if (anchor === target && pinned) hide();
      else show(target, true);
    } else if (!panel.contains(event.target)) hide();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      hide(true);
    } else if (event.target.matches('.help-trigger') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.target.click();
      if (!panel.hidden) panel.querySelector('.help-close').focus();
    }
  });
  panel.querySelector('.help-close').onclick = () => hide(true);
  window.addEventListener('resize', () => { if (!panel.hidden) position(); });
  document.addEventListener('scroll', event => {
    if (!panel.hidden && !panel.contains(event.target)) position();
  }, true);
  dismissDetached = () => { if (anchor && !anchor.isConnected) hide(); };
  enhanceHelp();
}
