# Progresso da busca de emprego de [SEU NOME]

> O Claude lê este arquivo inteiro no início de cada sessão, antes de qualquer outra coisa,
> e o atualiza sempre que uma etapa termina. Comece com ele vazio, assim como está.

**Última atualização:** [DD/MM/AAAA]

---

## 1. Onde paramos

- [Ex.: perfil configurado com /setup; primeira busca ainda não feita.]

| Empresa | Vaga | Canal | Status | Próxima etapa | Prazo |
|---|---|---|---|---|---|
| | | | | | |

Para acompanhar as candidaturas da Gupy: https://portal.gupy.io/my/applications

## 2. Próximos passos

1. [Ex.: rodar `/scrape` e depois `/rank`.]
2. [Ex.: aplicar nas 3 primeiras do ranking.]

## 3. Regras combinadas com o Claude

Ajuste esta lista ao seu gosto. São as regras que valeram na primeira versão deste setup:

- **Responder em português.**
- **Portais:** só Gupy (o LinkedIn e o freehire ficam com `enabled: false`; mude para `true` para usar).
- **Login:** você faz o login nos sites, no navegador. O Claude não digita senha nem cria conta.
- **Testes da Gupy** (lógica, perfil, Big Five, vídeo): você faz pessoalmente. O Claude não faz.
- **Pretensão salarial:** usar a resposta padrão do `CLAUDE.md`. Se o campo exigir número e não houver valor, o Claude pausa e pergunta.
- **Nada inventado:** toda resposta de formulário e todo CV saem só do que está no seu perfil (`CLAUDE.md` e `01-candidate-profile.md`).
- **Consentimentos:** só o aviso de privacidade obrigatório; consentimentos opcionais ficam desmarcados.
- **LinkedIn:** no máximo uma candidatura a cada ~5 minutos (automação vai contra os termos do LinkedIn).
- **Não fazer push** dos seus dados: este repositório guarda informação pessoal. Mantenha o seu clone privado.

## 4. Pendências do perfil

- [Ex.: atualizar o headline do LinkedIn; confirmar o turno da faculdade.]
