import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyASuOtqVLXK4iQDu68dyOoDZQeOpRPO53M",
  authDomain: "mision-18.firebaseapp.com",
  databaseURL: "https://mision-18-default-rtdb.firebaseio.com",
  projectId: "mision-18",
  storageBucket: "mision-18.firebasestorage.app",
  messagingSenderId: "204810184243",
  appId: "1:204810184243:web:51babb3f13c2e43f5e6546"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const stateRef = ref(db, "rooms/mision18");

const levels = [
["EL COMIENZO","Toda gran aventura comienza con una decisión. ¿Qué tipo de agente vas a ser?",["EXPLORADOR","AGENTE SECRETO"]],
["LA ENERGÍA","La misión exige estar preparado. Cada movimiento cuenta. Elegí cómo enfrentar el desafío.",["ADRENALINA","TRANQUILIDAD"]],
["EL INSTINTO","No siempre hay tiempo para pensar. A veces, la primera decisión es la más importante.",["PENSAR RÁPIDO","SEGUIR LA INTUICIÓN"]],
["EL CAMINO","El destino todavía es desconocido. Solo hay una forma de descubrir qué te espera.",["EL DESCONOCIDO","EL INESPERADO"]],
["EL ÚLTIMO PASO","Llegaste hasta acá. Ahora es momento de demostrar de qué estás hecho.",["IR POR TODO","SIN MIRAR ATRÁS"]],
["CÓDIGO SECRETO","El sistema detectó dos protocolos disponibles. Seleccioná uno para continuar.",["CÓDIGO ALFA","CÓDIGO OMEGA"]],
["ZONA DE RIESGO","La operación continúa en territorio desconocido. Tu próximo movimiento está por definirse.",["LA CIUDAD NOCTURNA","LA BASE SECRETA"]],
["EL TIEMPO CORRE","El reloj está en marcha. Cada segundo nos acerca al momento decisivo.",["OPERACIÓN RELÁMPAGO","OPERACIÓN SILENCIOSA"]],
["LA ÚLTIMA FRONTERA","Una última frontera te separa del final. No pierdas la concentración.",["EL PORTAL DE LUZ","LA PUERTA FINAL"]],
["MISIÓN CUMPLIDA","Agente Agustín... todos los sistemas están listos. Es hora de desbloquear el protocolo final.",["ACTIVAR PROTOCOLO FINAL","DESBLOQUEAR ARCHIVO"]]
];

const isControl = new URLSearchParams(location.search).get("view") === "control";
const loginView = document.getElementById("loginView");
const screenView = document.getElementById("screenView");
const controlView = document.getElementById("controlView");
const screenContent = document.getElementById("screenContent");
const controlContent = document.getElementById("controlContent");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

let lastEvent = -1;

const defaultState = {
  started: false,
  level: -1,
  choice: null,
  last_event: "ready",
  event_id: 0,
  finished: false
};

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-AR";
  u.rate = 0.86;
  u.pitch = 0.72;
  u.volume = 1;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.toLowerCase().startsWith("es-ar")) ||
                voices.find(v => v.lang.toLowerCase().startsWith("es"));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

function renderControl(s) {
  renderScreen(s);
  controlContent.innerHTML = screenContent.innerHTML;

  const start = controlContent.querySelector("#screen-start");
  if (start) start.onclick = () => performAction("start");

  controlContent.querySelectorAll("[data-choice]").forEach(b => {
    b.onclick = () => performAction("choose", {
      choice: b.dataset.choice
    });
  });

  const next = controlContent.querySelector("#screen-next");
  if (next) next.onclick = () => performAction("next");

  const reset = controlContent.querySelector("#screen-reset");
  if (reset) {
    reset.onclick = () => {
      if (confirm("¿Querés reiniciar la misión desde el principio?")) {
        performAction("reset");
      }
    };
  }
}
async function performAction(action, extra = {}) {
  try {
    await runTransaction(stateRef, current => {
      const s = current || {...defaultState};

      if (action === "start") {
        s.started = true;
        s.level = 0;
        s.choice = null;
        s.finished = false;
        s.last_event = "start";

      } else if (action === "choose" && s.started && !s.finished && !s.choice) {
        s.choice = String(extra.choice || "").slice(0,80);
        s.last_event = "choice";

      } else if (action === "next" && s.started && !s.finished && s.choice) {
        if (s.level < 9) {
          s.level++;
          s.choice = null;
          s.last_event = "next";
        } else {
          s.finished = true;
          s.last_event = "finish";
        }

      } else if (action === "reset") {
        s.started = false;
        s.level = -1;
        s.choice = null;
        s.finished = false;
        s.last_event = "reset";
      } else {
        return;
      }

      s.event_id = (s.event_id || 0) + 1;
      return s;
    });
  } catch (e) {
    alert("No se pudo guardar el cambio. Revisá la conexión a Internet.");
  }
}

function listenToGame() {
  onValue(stateRef, async snapshot => {
    let s = snapshot.val();

    if (s === null) {
      try {
        await runTransaction(stateRef, current => current === null ? {...defaultState} : current);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (isControl) {
      renderControl(s);
    } else {
      renderScreen(s);

      if (s.event_id !== lastEvent) {
        lastEvent = s.event_id;

        if (s.last_event === "start") {
          speak("Atención... Atención... Agente Agustín, si estás escuchando este mensaje, significa que has sido seleccionado. Hoy no es un día cualquiera. Una nueva etapa está por comenzar. Diez desafíos. Diez decisiones. Una misión. ¿Estás preparado?");
        } else if (s.last_event === "choice") {
          speak("Decisión registrada. No hay respuestas incorrectas, agente. Preparáte para el siguiente desafío.");
        } else if (s.last_event === "next" && s.level >= 0) {
          speak(levels[s.level][0] + ". " + levels[s.level][1]);
        } else if (s.last_event === "finish") {
          speak("Agente Agustín. Misión cumplida. Dieciocho años. Una nueva aventura comienza. Tres... dos... uno... Salí y descubrí lo que te está esperando. Felices dieciocho.");
        }
      }
    }
  }, error => {
    console.error(error);
    const connection = document.getElementById("connection");
    if (connection) connection.textContent = "ERROR DE CONEXIÓN";
  });
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginError.textContent = "";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
  } catch (e) {
    loginError.textContent = "Error: " + e.code;
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginView.classList.add("hidden");

    if (isControl) {
      controlView.classList.remove("hidden");
      screenView.classList.add("hidden");
    } else {
      screenView.classList.remove("hidden");
      controlView.classList.add("hidden");
    }

    listenToGame();
  } else {
    loginView.classList.remove("hidden");
    screenView.classList.add("hidden");
    controlView.classList.add("hidden");
  }
});

function renderScreen(s) {
if (!s.started) {
  screenContent.innerHTML = `
    <div class="kicker">PROTOCOLO DE OPERACIONES ESPECIALES</div>
    <h1>MISIÓN <span>18</span></h1>
    <p class="lead">AGENTE AGUSTÍN. UNA TRANSMISIÓN ESPECIAL ESTÁ POR COMENZAR.</p>
    <div class="final-mark">PREPARANDO<br>OPERACIÓN</div>
    <button id="screen-start">INICIAR MISIÓN</button>`;
  document.getElementById("screen-start").onclick = () => performAction("start");
  return;
}
   

 if (s.finished) {
    screenContent.innerHTML = `
      <div class="kicker">TRANSMISIÓN FINAL</div>
      <div class="final-mark">OPERACIÓN<br>FINALIZADA</div>
      <h2>¡FELICES 18, AGUSTÍN!</h2>
      <p class="lead">SALÍ Y DESCUBRÍ LO QUE TE ESTÁ ESPERANDO.</p>
      <div class="big-number">3 · 2 · 1</div>
      <p class="lead">FIN DE LA TRANSMISIÓN</p>
      <button id="screen-reset" class="secondary">REINICIAR MISIÓN</button>`;
    document.getElementById("screen-reset").onclick = () => performAction("reset");
    return;
  }
  const n = s.level + 1;
  const l = levels[s.level];
const presentacion = encodeURI(`presentacion desafio ${n}.jpg`);
const opcionA = encodeURI(`desafio ${n}-a.jpg`);
const opcionB = encodeURI(`desafio ${n}-b.jpg`);
  const pct = n * 10;

  screenContent.innerHTML = `
    <div class="big-number">DESAFÍO ${String(n).padStart(2,"0")} / 10</div>
    <div style="height:4px;"></div>
    <div class="meter"><span style="width:${pct}%"></span></div>
    <img src="${presentacion}" alt="Presentación del desafío ${n}"
   style="display:block;width:100%;height:22vh;object-fit:contain;margin:2px auto;">
    <div class="kicker">NIVEL ${String(n).padStart(2,"0")}</div>
    <h2>${l[0]}</h2>
    <p class="lead">${l[1]}</p>
   <div class="choice-grid">
  <div class="choice">
    <small>OPCIÓN 01</small>
    <img src="${opcionA}" alt="${l[2][0]}"
   style="width:100%;height:28vh;object-fit:contain;">
    <strong>${l[2][0]}</strong>
    <button data-choice="${l[2][0]}" ${s.choice?"disabled":""}>${l[2][0]}</button>
  </div>
  <div class="choice">
    <small>OPCIÓN 02</small>
    <img src="${opcionB}" alt="${l[2][1]}"
    style="width:100%;height:28vh;object-fit:contain;">
    <button data-choice="${l[2][1]}" ${s.choice?"disabled":""}>${l[2][1]}</button>
  </div>
</div>

<button id="screen-next" ${s.choice?"":"disabled"}>
  ${s.level===9?"FINALIZAR MISIÓN":"SIGUIENTE DESAFÍO"}
</button>
<button id="screen-reset" class="secondary">
  REINICIAR MISIÓN
</button>

${s.choice ? `<p class="status">DECISIÓN REGISTRADA: ${s.choice}</p>` : ""}
  `;

  screenContent.querySelectorAll("[data-choice]").forEach(b => {
    b.onclick = () => performAction("choose", {choice:b.dataset.choice});
  });

 document.getElementById("screen-next").onclick = () => performAction("next");

  document.getElementById("screen-reset").onclick = () => {
    if (confirm("¿Querés reiniciar la misión desde el principio?")) {
      performAction("reset");
    }
  };
}
