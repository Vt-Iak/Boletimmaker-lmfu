/* Boletim Maker — configuração da plataforma própria (Firebase).
   Estes valores identificam o projeto e são públicos por natureza (vão para
   o navegador de qualquer visitante); quem protege os dados são as regras
   em firestore.rules. O app só usa isto no site publicado (https), nunca no
   arquivo local nem no aplicativo Windows. */
window.BOLETIM_FIREBASE = {
  config: {
    apiKey: "AIzaSyDSgxsTs79MyAReXKKlb1tGQJzjtktUyXs",
    authDomain: "boletimmaker-lmfu.firebaseapp.com",
    projectId: "boletimmaker-lmfu",
    storageBucket: "boletimmaker-lmfu.firebasestorage.app",
    messagingSenderId: "623811393050",
    appId: "1:623811393050:web:ae587103488c4f818cc3a3"
  },
  // Dono do boletim: único que gerencia o acesso e exclui edições.
  owner: "joaovcsoares5@gmail.com",
  // Repositório do site e da coleta da Pauta (GitHub Actions grava em pautas/).
  repo: "Vt-Iak/Boletimmaker-lmfu",
  // Endereços onde o app conecta ao Firebase (além de *.github.io).
  hosts: ["boletimmaker-lmfu.web.app", "boletimmaker-lmfu.firebaseapp.com"]
};
