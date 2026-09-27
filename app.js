let usuarioLogado = null;

// 🔐 Verifica login
auth.onAuthStateChanged((usuario) => {
  if (usuario) {
    usuarioLogado = usuario;
    mostrarApp();
  } else {
    usuarioLogado = null;
    mostrarInicial();
  }
});

function mostrarApp() {
  document.getElementById('tela-inicial').classList.add('escondido');
  document.getElementById('tela-login').classList.add('escondido');
  document.getElementById('tela-cadastro').classList.add('escondido');
  document.getElementById('tela-app').classList.remove('escondido');
  
  document.getElementById('perfil-nome').textContent = usuarioLogado.displayName || 'Não informado';
  document.getElementById('perfil-email').textContent = usuarioLogado.email;
  document.getElementById('perfil-data').textContent = new Date(usuarioLogado.metadata.creationTime).toLocaleDateString('pt-BR');
  
  carregarComunidades();
  carregarTreinosDoUsuario();
}

function mostrarInicial() {
  document.getElementById('tela-inicial').classList.remove('escondido');
  document.getElementById('tela-login').classList.add('escondido');
  document.getElementById('tela-cadastro').classList.add('escondido');
  document.getElementById('tela-app').classList.add('escondido');
}

// 🔐 Conta
window.criarConta = async function() {
  const nome = document.getElementById('cadastro-nome').value;
  const email = document.getElementById('cadastro-email').value;
  const senha = document.getElementById('cadastro-senha').value;
  
  if (!nome || !email || !senha) { alert('⚠️ Preencha tudo!'); return; }
  if (senha.length < 6) { alert('⚠️ Senha com mínimo 6 caracteres!'); return; }
  
  try {
    const resp = await auth.createUserWithEmailAndPassword(email, senha);
    await resp.user.updateProfile({ displayName: nome });
    await db.collection('usuarios').doc(resp.user.uid).set({
      nome, email, dataCriacao: new Date()
    });
    alert('✅ Conta criada! Bem-vindo, ' + nome + '!');
  } catch (erro) {
    alert('❌ ' + (erro.code === 'auth/email-already-in-use' ? 'E-mail já cadastrado!' : erro.message));
  }
};

window.fazerLogin = async function() {
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  if (!email || !senha) { alert('⚠️ Preencha e-mail e senha!'); return; }
  try {
    await auth.signInWithEmailAndPassword(email, senha);
    alert('✅ Bem-vindo de volta!');
  } catch (erro) { alert('❌ Erro: ' + erro.message); }
};

window.sairDaConta = async function() {
  if (confirm('Sair da conta?')) { await auth.signOut(); alert('👋 Até logo!'); }
};

// ⚽ Dados da modalidade
const TAMANHO_TIME = {
  futsal: 5,
  society: 8,
  campo: 11
};

// 🏟️ Criar comunidade
window.salvarComunidade = async function() {
  const nome = document.getElementById('com-nome').value;
  const local = document.getElementById('com-local').value;
  const modalidade = document.getElementById('com-modalidade').value;
  const horarioLimite = document.getElementById('com-horario-limite').value;
  const horarioInicio = document.getElementById('com-horario-inicio').value;
  
  if (!nome || !local || !modalidade) { alert('⚠️ Preencha nome, local e modalidade!'); return; }
  
  const tamanho = TAMANHO_TIME[modalidade];
  
  try {
    await db.collection('comunidades').add({
      nome, local, modalidade,
      tamanhoTime: tamanho,
      horarioLimite, horarioInicio,
      criadorId: usuarioLogado.uid,
      criadorNome: usuarioLogado.displayName,
      jogadores: [],
      times: {},
      dataCriacao: new Date()
    });
    alert('✅ Comunidade criada com sucesso!');
    fecharModalComunidade();
    carregarComunidades();
  } catch (erro) { alert('❌ Erro: ' + erro.message); }
};

// 📋 Carregar comunidades
async function carregarComunidades() {
  const lista = document.getElementById('lista-comunidades');
  lista.innerHTML = '<p style="text-align:center; color:#64748b;">Carregando...</p>';
  
  try {
    const snap = await db.collection('comunidades').orderBy('dataCriacao', 'desc').get();
    
    if (snap.empty) {
      lista.innerHTML = '<p style="text-align:center; color:#64748b; padding:2rem;">Nenhuma comunidade ainda. Seja o primeiro a criar uma! 🎉</p>';
      return;
    }
    
    lista.innerHTML = '';
    snap.forEach(doc => {
      const com = doc.data();
      const total = com.jogadores?.length || 0;
      const t = com.tamanhoTime;
      const maxJogadores = t * 2;
      const times = formarTimesEFila(com.jogadores || [], t);
      const ehCompleto = times.timeA.length === t && times.timeB.length === t;
      
      let statusHTML = '';
      if (ehCompleto) {
        statusHTML = `<p style="color: #16a34a; font-weight:600;">✅ Jogo confirmado! ${total}/${maxJogadores}</p>`;
      } else {
        statusHTML = `<p style="color: #f97316;">⏳ ${total}/${maxJogadores} — Precisa de ${(t*2)-total} jogador(es) para confirmar</p>`;
      }
      
      lista.innerHTML += `
        <div class="cartao">
          <h3>${com.nome}</h3>
          <p>📍 ${com.local}</p>
          <p>⚽ ${com.modalidade.charAt(0).toUpperCase() + com.modalidade.slice(1)} — ${t}x${t}</p>
          <p>🕒 Até ${com.horarioLimite} • Início ${com.horarioInicio}</p>
          ${statusHTML}
          
          ${ehCompleto ? `
            <button class="btn btn-laranja btn-pequeno" style="margin-top:0.5rem;" onclick="abrirSorteio('${doc.id}')">🎲 Realizar Sorteio</button>
          ` : ''}
          
          ${!com.jogadores?.includes(usuarioLogado.uid) ? `
            <button class="btn btn-sucesso btn-pequeno" style="margin-top:0.5rem;" onclick="entrarComunidade('${doc.id}')">✅ Confirmar Presença</button>
          ` : `
            <p style="color:#16a34a; font-weight:600; margin-top:0.5rem;">✅ Você está confirmado!</p>
          `}
          
          <button class="btn btn-pequeno" style="background: #e0f2fe; color: #0369a1; margin-top:0.3rem;" onclick="copiarLinkComunidade('${doc.id}')">🔗 Copiar Link</button>
          <button class="btn btn-pequeno" style="background: #f0fdf4; color: #166534; margin-top:0.3rem;" onclick="verNoMapa('${com.local}')">🗺️ Ver no Mapa</button>
          
          ${times.fila.length > 0 ? `
            <div style="margin-top:0.8rem;">
              <p style="font-weight:600; color:#475569;">📋 Fila de Espera:</p>
              ${times.fila.map((grupo, idx) => `
                <div class="fila-item ${idx === 0 ? 'proximo' : ''}">
                  <strong>${idx === 0 ? '🥇 Próximo' : '#' + (idx+1)}</strong> — ${grupo.length} jogadores
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });
  } catch (erro) {
    console.error(erro);
    lista.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar</p>';
  }
}

// 🧠 FORMAR TIMES E FILA — LÓGICA PRINCIPAL
function formarTimesEFila(jogadores, tamanhoTime) {
  const timeA = [];
  const timeB = [];
  const fila = [];
  
  for (let i = 0; i < jogadores.length; i++) {
    const posicao = i + 1;
    if (posicao <= tamanhoTime) {
      timeA.push(jogadores[i]);
    } else if (posicao <= tamanhoTime * 2) {
      timeB.push(jogadores[i]);
    } else {
      const posicaoNaFila = posicao - (tamanhoTime * 2);
      const indiceTimeFila = Math.floor((posicaoNaFila - 1) / tamanhoTime);
      if (!fila[indiceTimeFila]) fila[indiceTimeFila] = [];
      fila[indiceTimeFila].push(jogadores[i]);
    }
  }
  
  return { timeA, timeB, fila: fila.filter(grupo => grupo.length === tamanhoTime) };
}

// 🤝 Entrar na comunidade
window.entrarComunidade = async function(comunidadeId) {
  if (!usuarioLogado) { alert('⚠️ Faça login primeiro!'); return; }
  
  try {
    const ref = db.collection('comunidades').doc(comunidadeId);
    const doc = await ref.get();
    if (!doc.exists) { alert('⚠️ Comunidade não encontrada!'); return; }
    
    const dados = doc.data();
    const jogadores = dados.jogadores || [];
    const t = dados.tamanhoTime;
    const maxTotal = t * 2;
    const maxComFila = maxTotal + (t * 5);
    
    if (jogadores.includes(usuarioLogado.uid)) {
      alert('✅ Você já está confirmado!');
      return;
    }
    
    if (jogadores.length >= maxComFila) {
      alert('⚠️ A comunidade está cheia e a fila também! Tente o próximo treino.');
      return;
    }
    
    jogadores.push(usuarioLogado.uid);
    await ref.update({ jogadores });
    
    const novaPosicao = jogadores.length;
    if (novaPosicao <= maxTotal) {
      alert(`✅ Presença confirmada! Você é o ${novaPosicao}º jogador.`);
    } else {
      const posicaoNaFila = novaPosicao - maxTotal;
      const numeroTimeFila = Math.ceil(posicaoNaFila / t);
      alert(`📋 Você entrou na FILA DE ESPERA!\nSeu time: #${numeroTimeFila} da fila`);
    }
    
    carregarComunidades();
  } catch (erro) {
    alert('❌ Erro: ' + erro.message);
  }
};

// 🎲 SORTEIO DE TIMES
window.abrirSorteio = async function(comunidadeId) {
  try {
    const doc = await db.collection('comunidades').doc(comunidadeId).get();
    const com = doc.data();
    const todosJogadores = [...(com.jogadores || [])];
    const t = com.tamanhoTime;
    
    for (let i = todosJogadores.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [todosJogadores[i], todosJogadores[j]] = [todosJogadores[j], todosJogadores[i]];
    }
    
    const timeA = todosJogadores.slice(0, t);
    const timeB = todosJogadores.slice(t, t * 2);
    const timeComBola = Math.random() > 0.5 ? 'A' : 'B';
    
    await db.collection('comunidades').doc(comunidadeId).update({
      times: { timeA, timeB, timeComBola, dataSorteio: new Date() }
    });
    
    mostrarResultadoSorteio(com.nome, timeA, timeB, timeComBola, t, comunidadeId);
  } catch (erro) {
    alert('❌ Erro no sorteio: ' + erro.message);
  }
};

// 📱 Mostra resultado do sorteio
function mostrarResultadoSorteio(nomeComunidade, timeA, timeB, timeComBola, tamanho, comunidadeId) {
  const nomes = {
    futsal: 'Jogador',
    society: 'Jogador',
    campo: 'Jogador'
  };
  
  const html = `
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:300; padding:1.5rem; overflow-y:auto;">
      <div class="container">
        <h2 style="text-align:center; color:#1e40af; margin-bottom:1.5rem;">🎲 Resultado do Sorteio</h2>
        <p style="text-align:center; color:#64748b; margin-bottom:1rem;">${nomeComunidade}</p>
        
        <div class="time-container">
          <div class="time time-a">
            <h4>🔴 Time A</h4>
            <ul>
              ${timeA.map((_, i) => `<li>${nomes[tamanho] || 'Jogador'} ${i+1}</li>`).join('')}
            </ul>
          </div>
          <div class="time time-b">
            <h4>🔵 Time B</h4>
            <ul>
              ${timeB.map((_, i) => `<li>${nomes[tamanho] || 'Jogador'} ${i+1}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <div class="vencedor-bola">
          <h3>⚽ Quem começa com a bola?</h3>
          <p style="font-size:1.3rem; font-weight:bold; margin-top:0.5rem;">${timeComBola === 'A' ? '🔴 TIME A' : '🔵 TIME B'}</p>
          <p>Começa jogando!</p>
        </div>
        
        <button class="btn btn-laranja" onclick="abrirSorteio('${comunidadeId}')">🔄 Sortear de Novo</button>
        <button class="btn btn-voltar" onclick="fecharResultadoSorteio()">Fechar</button>
      </div>
    </div>
  `;
  
  const div = document.createElement('div');
  div.id = 'resultado-sorteio';
  div.innerHTML = html;
  document.body.appendChild(div);
}

window.fecharResultadoSorteio = function() {
  const el = document.getElementById('resultado-sorteio');
  if (el) el.remove();
};

// 🔗 COMPARTILHAR LINK DA COMUNIDADE
window.copiarLinkComunidade = function(comunidadeId) {
  const link = window.location.origin + window.location.pathname + '?comunidade=' + comunidadeId;
  navigator.clipboard.writeText(link)
    .then(() => {
      alert('✅ Link copiado com sucesso!\n\nAgora é só compartilhar com seus amigos! ⚽');
    })
    .catch(() => {
      alert('📋 Copie esse link:\n\n' + link);
    });
};

// 🗺️ VER LOCALIZAÇÃO NO MAPA
window.verNoMapa = function(localidade) {
  if (!localidade || localidade.trim() === '') {
    alert('⚠️ Nenhuma localidade cadastrada para esta comunidade!');
    return;
  }
  const endereco = encodeURIComponent(localidade + ', Carnaubeira da Penha - PE, Brasil');
  window.open('https://www.google.com/maps/search/?api=1&query=' + endereco, '_blank');
};

// ⚽ Carregar treinos do usuário
async function carregarTreinosDoUsuario() {
  const lista = document.getElementById('lista-treinos');
  lista.innerHTML = '<p style="text-align:center; color:#64748b;">Suas comunidades aparecerão aqui</p>';
}

console.log("✅ App.js carregado completo!");
