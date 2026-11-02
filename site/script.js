(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-nav');
  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    navigation.classList.toggle('is-open', open);
  };

  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) setMenu(false);
  });
  window.matchMedia('(min-width: 681px)').addEventListener('change', () => setMenu(false));

  const connections = {
    amizade: {
      number: '01 / 03',
      title: 'Aquela conversa que faz o dia mais leve.',
      description: 'Trocar histórias, descobrir um gosto em comum ou simplesmente ter alguém para perguntar: “Como foi seu dia?”. Uma boa amizade pode começar assim.',
      features: ['Interesses que aproximam', 'Conversas com espaço para ser você', 'Conexões sem pressa'],
      name: 'Helena, 58',
      bio: 'Uma boa conversa sempre cabe no dia.',
      image: 'assets/perfil-helena.svg',
      alt: 'Ilustração de Helena, personagem de um perfil demonstrativo.',
      interests: ['Jardinagem', 'Um bom café', 'MPB'],
    },
    companhia: {
      number: '02 / 03',
      title: 'O passeio de sempre. Uma nova companhia.',
      description: 'Uma caminhada no parque, um filme no domingo ou aquela viagem que ficou para depois. Compartilhar pequenos planos pode transformar a rotina.',
      features: ['Pessoas que gostam do que você gosta', 'Mais possibilidades para o dia a dia', 'Liberdade para escolher sua companhia'],
      name: 'Marcos, 62',
      bio: 'Sempre cabe mais alguém na caminhada.',
      image: 'assets/perfil-marcos.svg',
      alt: 'Ilustração de Marcos, personagem de um perfil demonstrativo.',
      interests: ['Caminhadas', 'Cinema', 'Viagens'],
    },
    relacionamento: {
      number: '03 / 03',
      title: 'O coração também gosta de novos capítulos.',
      description: 'Conhecer alguém com quem dividir carinho, planos e boas conversas. Com respeito à sua história e espaço para descobrir o que vem pela frente.',
      features: ['Intenções claras desde o começo', 'Afinidade para além da aparência', 'Tempo para conhecer de verdade'],
      name: 'Lúcia, 56',
      bio: 'Boas histórias merecem novos capítulos.',
      image: 'assets/perfil-lucia.svg',
      alt: 'Ilustração de Lúcia, personagem de um perfil demonstrativo.',
      interests: ['Dança', 'Livros', 'Cozinhar'],
    },
  };

  const tabs = Array.from(document.querySelectorAll('[data-intent]'));
  const panel = document.querySelector('#intent-panel');
  const chooseConnection = (tab) => {
    const connection = connections[tab.dataset.intent];
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);
    document.querySelector('.panel-number').textContent = connection.number;
    document.querySelector('#intent-title').textContent = connection.title;
    document.querySelector('#intent-description').textContent = connection.description;
    document.querySelector('#profile-name').textContent = connection.name;
    document.querySelector('#profile-bio').textContent = connection.bio;
    const image = document.querySelector('#profile-image');
    image.src = connection.image;
    image.alt = connection.alt;
    const featureList = document.querySelector('#intent-features');
    const featureTemplate = featureList.firstElementChild.cloneNode(true);
    featureList.replaceChildren(...connection.features.map((feature) => {
      const item = featureTemplate.cloneNode(true);
      item.replaceChildren(item.firstElementChild, document.createTextNode(` ${feature}`));
      return item;
    }));
    document.querySelector('#profile-interests').replaceChildren(...connection.interests.map((interest) => {
      const tag = document.createElement('span');
      tag.textContent = interest;
      return tag;
    }));
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseConnection(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex !== undefined) {
        event.preventDefault();
        tabs[nextIndex].focus();
        chooseConnection(tabs[nextIndex]);
      }
    });
  });

  document.querySelector('#year').textContent = String(new Date().getFullYear());
  const privacy = document.querySelector('#privacidade');
  const openHashTarget = () => {
    if (window.location.hash === '#privacidade') privacy.open = true;
  };
  window.addEventListener('hashchange', openHashTarget);
  openHashTarget();
  document.querySelector('a[href="#privacidade"]').addEventListener('click', () => { privacy.open = true; });

  const config = window.BEYONDTIME_CONFIG || {};
  let appUrl = null;
  try {
    if (config.appUrl) {
      const candidate = new URL(config.appUrl);
      if (candidate.protocol === 'https:') appUrl = candidate.href;
    }
  } catch { /* Configuração inválida mantém a apresentação de pré-lançamento. */ }

  const appAction = document.querySelector('[data-app-action]');
  if (appUrl) {
    appAction.href = appUrl;
    appAction.replaceChild(document.createTextNode('Acessar o aplicativo '), appAction.firstChild);
    appAction.rel = 'noopener noreferrer';
    document.querySelector('[data-release-status]').textContent = 'CONHEÇA O APLICATIVO';
    document.querySelector('[data-release-hint]').textContent = 'Acesse o link oficial disponibilizado pela equipe.';
    document.querySelector('[data-release-answer]').textContent = 'A equipe disponibilizou um link de acesso na seção “Conheça o app”, ao final desta página. Consulte nesse link as plataformas disponíveis e as condições de acesso.';
    document.querySelector('[data-launch-text]').textContent = 'Confira a disponibilidade e as informações da versão atual no link oficial. Este site não realiza cadastros.';
  } else {
    appAction.addEventListener('click', () => {
      const information = document.querySelector('#lancamento');
      information.classList.remove('is-highlighted');
      requestAnimationFrame(() => information.classList.add('is-highlighted'));
    });
  }

  if (typeof config.contactEmail === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.contactEmail) && !/[?&#%]/.test(config.contactEmail)) {
    const contact = document.querySelector('[data-contact-link]');
    contact.href = `mailto:${config.contactEmail}`;
    contact.hidden = false;
  }
})();
