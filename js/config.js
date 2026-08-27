/* =========================================================
   CONFIGURAÇÃO — Sacolão Automatizador de e-mail
   ========================================================= */

// Cole aqui o seu Client ID gerado no Google Cloud Console
const GOOGLE_CLIENT_ID = "77948638954-066c13a98i0puussbbpfjdr7qnohhmrh.apps.googleusercontent.com";

const STORE_EMAILS = {
  lapa:     "hemeson.jasp@gmail.com, jvitorlima19@hotmail.com, leandrosaclapa@yahoo.com.br, givanildo.sacolaohigienopolis@gmail.com, emillysacolao@gmail.com, josicarlaj8@gmail.com, adrianacosta.sacolaolapa@gmail.com, joao.bernardi.sacolao@gmail.com, biondisacolao@gmail.com",
  hig:      "hemeson.jasp@gmail.com, lara.higienopolis@gmail.com, laurasacolao4@gmail.com, Thiago@sacolaohigienopolis.com.br, leandrosaclapa@yahoo.com.br, joao.bernardi.sacolao@gmail.com, biondisacolao@gmail.com, givanildo.sacolaohigienopolis@gmail.com",
  ce:       "hemeson.jasp@gmail.com, cleiane_nani@hotmail.com, juliana.sacolaocampos@gmail.com, felipesacolaocamposeliseos@gmail.com, joao.bernardi.sacolao@gmail.com, leandrosaclapa@yahoo.com.br, biondisacolao@gmail.com, givanildo.sacolaohigienopolis@gmail.com",
  perdizes: "hemeson.jasp@gmail.com, atendimento@sacolaoperdizes.com.br, jennyfferperdizes@gmail.com, leandrosaclapa@yahoo.com.br, joao.bernardi.sacolao@gmail.com, biondisacolao@gmail.com, givanildo.sacolaohigienopolis@gmail.com, Iagoperdizes0@gmail.com",
};

const STORE_NAMES = {
  lapa:     "Lapa",
  hig:      "Hig",
  ce:       "Campos",
  perdizes: "Perdizes",
};

// Palavras-chave permitidas nos nomes dos arquivos para cada loja
const STORE_KEYWORDS = {
  lapa:     ["lapa"],
  hig:      ["hig", "higienopolis", "higienópolis"],
  ce:       ["ce", "campos", "eliseos", "elíseos", "c.e", "c.e."],
  perdizes: ["perdizes", "perdi", "perd"],
};