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
  apiKey: "AIzaSyASuOtqVLXK4iQDu68dyOoDZQeOpRPO53",
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

const isControl = location.pathname.replace(/\/+$/, "") === "/control";
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

function renderScreen(s) {
  document.getElementById("connection").textContent = "ENLACE ACTIVO";

  if (!s.started) {
    screenContent.innerHTML = `
      <div class="kicker">PROTOCOLO DE OPERACIONES ESPECIALES</div>
      <h1>MISIÓN <span>18</span></h1>
      <p class="lead">AGENTE AGUSTÍN. UNA TRANSMISIÓN ESPECIAL ESTÁ POR COMENZAR.</p>
      <div class="final-mark">PREPARANDO<br>OPERACIÓN</div>`;
  } else if (s.finished) {
    screenContent.innerHTML = `
      <div class="kicker">TRANSMISIÓN FINAL</div>
      <div class="final-mark">OPERACIÓN<br>FINALIZADA</div>
      <h2>¡FELICES 18, AGUSTÍN!</h2>
      <p class="lead">SALÍ Y DESCUBRÍ LO QUE TE ESTÁ ESPERANDO.</p>
      <div class="big-number">3 · 2 · 1</div>
      <p class="lead">FIN DE LA TRANSMISIÓN</p>`;
  } else {
    const l = levels[s.level];
    const pct = (s.level + 1) * 10;
    screenContent.innerHTML = `
      <div class="big-number">DESAFÍO ${String(s.level+1).padStart(2,"0")} / 10</div>
      <div class="meter"><span style="width:${pct}%"></span></div>
      <div class="kicker">NIVEL ${String(s.level+1).padStart(2,"0")}</div>
      <h2>${l[0]}</h2>
      <p class="lead">${l[1]}</p>
      <div class="choice-grid">
        ${l[2].map((c,i) => `<div class="choice"><small>OPCIÓN 0${i+1}</small><strong>${c}</strong></div>`).join("")}
      </div>
      ${s.choice ? `<p class="status">DECISIÓN REGISTRADA: ${s.choice}</p>` : ""}`;
  }
}

function renderControl(s) {
  if (!s.started) {
    controlContent.innerHTML = `
      <div class="control-card">
        <div class="kicker">LISTO PARA INICIAR</div>
        <h2>AGENTE AGUSTÍN</h2>
        <p>Cuando todos estén mirando el proyector, tocá el botón para iniciar la transmisión.</p>
        <button id="start">INICIAR MISIÓN</button>
      </div>`;
    document.getElementById("start").onclick = () => performAction("start");

  } else if (s.finished) {
    controlContent.innerHTML = `
      <div class="control-card">
        <div class="kicker">PROTOCOLO COMPLETADO</div>
        <h2>MISIÓN FINALIZADA</h2>
        <p>La pantalla principal ya muestra el mensaje de cierre.</p>
        <button class="secondary" id="reset">REINICIAR DEMO</button>
      </div>`;
    document.getElementById("reset").onclick = () => performAction("reset");

  } else {
    const l = levels[s.level];
    controlContent.innerHTML = `
      <div class="control-card">
        <div class="kicker">DESAFÍO ${s.level+1} DE 10</div>
        <h2>${l[0]}</h2>
        <p>${l[1]}</p>
        <div class="control-buttons">
          ${l[2].map((c,i) => `<button class="${i===1?"secondary":""}" data-choice="${c}" ${s.choice?"disabled":""}>${c}</button>`).join("")}
        </div>
        <div class="status">${s.choice ? "ELECCIÓN REGISTRADA: "+s.choice : "ELEGÍ UNA OPCIÓN PARA CONTINUAR"}</div>
        <button id="next" ${s.choice?"":"disabled"}>${s.level===9?"FINALIZAR MISIÓN":"SIGUIENTE DESAFÍO"}</button>
      </div>`;

    controlContent.querySelectorAll("[data-choice]").forEach(b => {
      b.onclick = () => performAction("choose", {choice:b.dataset.choice});
    });
    document.getElementById("next").onclick = () => performAction("next");
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
    loginError.textContent = "Error: + e.code;
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
