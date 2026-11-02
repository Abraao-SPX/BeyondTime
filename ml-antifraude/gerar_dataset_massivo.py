import random
import csv

random.seed(42)

def generate_full_dataset():
    data = []

    # =========================================================================
    # 1. NORMAL (Exatamente 3.000)
    # =========================================================================
    saudacoes = [
        "Bom dia meu bem, que Deus abençoe seu dia e de toda a sua família",
        "Boa tarde querida, espero que sua semana esteja sendo muito iluminada",
        "Boa noite meu querido, durma com Deus e tenha lindos sonhos",
        "Oi meu anjo, passei para te desejar uma excelente manhã com muita paz",
        "Como você está, meu coração? Acordou bem hoje?",
        "Que bom poder conversar com você, sua companhia me faz tão bem",
        "Você tem uma energia tão gostosa, fico feliz quando vejo sua mensagem",
        "Estava pensando em você agora pouco enquanto tomava meu cafezinho",
        "Tenha um lindo dia, que Nossa Senhora cubra você de bênçãos",
        "Adoro o seu sorriso nas fotos do seu perfil, você parece tão simpático",
        "Obrigada pelo carinho de sempre, você alegra minhas manhãs",
        "Muito feliz em te conhecer, você é uma pessoa muito educada e atenciosa",
        "Um abraço bem apertado e carinhoso para você",
        "Fiquei contente de falar com você ontem à noite, dormi com o coração leve",
        "Espero que seu dia tenha sido tranquilo e sem correria",
        "Que linda mensagem, você é sempre uma pessoa muito gentil comigo",
        "Bom final de semana, aproveite bastante para descansar e ficar com quem ama",
        "Paz e luz para o seu caminho hoje e sempre, meu amigo",
        "Estou aqui torcendo para que tudo dê certo na sua rotina hoje",
        "Com carinho e consideração, desejo tudo de bom para você"
    ]

    sujeitos_norm = ["Eu", "Meu filho", "Minha filha", "Minha neta", "Meu neto", "Minha vizinha", "Meu irmão", "Minha irmã", "Nós", "A família toda"]
    verbos_norm = [
        "fomos caminhar na praça", "fomos ao supermercado fazer a compra do mês", "almoçamos juntos domingo",
        "fizemos um café da tarde delicioso", "assistimos a missa pela televisão", "viajamos para a chácara no interior",
        "fomos na igreja agradecer pelas graças", "conversamos bastante na varanda", "limpamos o quintal e cuidamos das plantas",
        "fomos na feira comprar verduras frescas", "fizemos um bolo de fubá quentinho", "fomos ao médico fazer exames de rotina",
        "levamos os cachorros para passear", "fomos tomar um sorvete no centro", "bordamos uma toalha de mesa linda",
        "preparamos o almoço com muito carinho", "escutamos músicas antigas dos anos 70", "fomos pagar as contas de água e luz no banco",
        "compramos sementes para a horta comunitária", "assistimos ao jornal e conversamos sobre a vida"
    ]
    tempos_norm = ["ontem à tarde", "hoje de manhã cedo", "no último sábado", "neste final de semana", "na segunda-feira passada", "no início da semana", "agora pouco", "ao entardecer", "durante a manhã", "depois do almoço"]
    fechamentos_norm = [
        "e foi muito agradável.", "graças a Deus.", "com as bênçãos do Senhor.", "para descansar a cabeça.",
        "e tudo correu em paz.", "aproveitando a brisa fresca.", "e matamos a saudade.", "foi uma tarde muito feliz.",
        "e estava tudo uma delícia.", "como sempre fazemos com calma."
    ]

    pool_normal = set()
    for s in saudacoes:
        pool_normal.add(s + ".")
        for f in fechamentos_norm[:5]:
            pool_normal.add(f"{s}, {f.lower()}")

    for su in sujeitos_norm:
        for v in verbos_norm:
            for t in tempos_norm:
                for f in fechamentos_norm:
                    pool_normal.add(f"{su} {v} {t} {f}")
                    pool_normal.add(f"{t.capitalize()}, {su.lower()} {v} {f}")
                    if len(pool_normal) >= 4000:
                        break
                if len(pool_normal) >= 4000:
                    break
            if len(pool_normal) >= 4000:
                break
        if len(pool_normal) >= 4000:
            break

    lista_normal = list(pool_normal)
    random.shuffle(lista_normal)
    for frase in lista_normal[:3000]:
        data.append((frase, "NORMAL"))

    # =========================================================================
    # 2. PEDIDO_DINHEIRO (Exatamente 1.200)
    # =========================================================================
    pool_pedidos = set()
    verbos_ped = ["Você consegue me fazer um pix de", "Pode me transferir", "Tem como me emprestar", "Faz um pix rápido de", "Manda para minha chave pix", "Transfere agora", "Consegue depositar", "Pode me mandar um valor de", "Você me socorre com um pix de", "Tem como me adiantar", "Consegue mandar um dinheiro de", "Faz uma transferência de"]
    valores_ped = ["R$ 80", "R$ 150", "200 reais", "R$ 250", "300 reais", "R$ 350", "400 reais", "R$ 500", "600 reais", "R$ 750", "800 reais", "1.000 reais", "R$ 1.200", "1.500 reais", "essa quantia de R$ 300", "esse dinheiro de 450 reais"]
    motivos_ped = ["para pagar uma conta de água que vence hoje", "porque meu salário atrasou este mês", "para liberar meu limite do cartão", "porque esqueci minha senha no banco", "para cobrir o saldo devedor", "para inteirar um pagamento urgente", "porque deu problema no aplicativo do meu banco", "para pagar uma taxa imprevista no cartório", "para comprar o gás que acabou agora", "para pagar o mecânico que terminou a revisão"]
    garantias_ped = ["te devolvo amanhã cedo sem falta.", "segunda-feira te pago com juros.", "assim que meu dinheiro cair eu te mando de volta.", "prometo que devolvo tudo até sexta.", "te pago o dobro semana que vem.", "minha palavra vale ouro, te devolvo logo.", "amanhã meio-dia o valor já estará na sua conta.", "pode confiar, nunca deixei de pagar ninguém.", "te compenso pelo favor assim que receber.", "é só até meu filho fazer a transferência para mim."]

    for v in verbos_ped:
        for val in valores_ped:
            for mot in motivos_ped:
                for gar in garantias_ped:
                    pool_pedidos.add(f"{v} {val} {mot}, {gar}")
                    pool_pedidos.add(f"Por favor, {v.lower()} {val}? É {mot}. {gar}")
                    if len(pool_pedidos) >= 2000:
                        break
                if len(pool_pedidos) >= 2000:
                    break
            if len(pool_pedidos) >= 2000:
                break
        if len(pool_pedidos) >= 2000:
            break

    lista_pedidos = list(pool_pedidos)
    random.shuffle(lista_pedidos)
    for frase in lista_pedidos[:1200]:
        data.append((frase, "PEDIDO_DINHEIRO"))

    # =========================================================================
    # 3. MENSAGEM_SUSPEITA (Exatamente 1.200)
    # =========================================================================
    pool_suspeitas = set()
    palavras_ofuscadas = [
        "p.i.x", "p-i-x", "p_i_x", "p*i*x", "p/i/x", "p i x", "p . i . x",
        "c-v-v", "c.v.v", "c v v", "c_v_v", "c*v*v", "c / v / v",
        "d-i-n-h-e-i-r-o", "d.i.n.h.e.i.r.o", "d i n h e i r o", "d_i_n_h_e_i_r_o",
        "t-r-a-n-s-f-e-r-e", "t.r.a.n.s.f.e.r.e", "t r a n s f e r e", "t_r_a_n_s_f_e_r_e",
        "s-e-n-h-a", "s.e.n.h.a", "s e n h a", "s_e_n_h_a", "s*e*n*h*a",
        "c.ó.d.i.g.o", "c-ó-d-i-g-o", "c ó d i g o", "c_o_d_i_g_o",
        "b.a.n.c.o", "b-a-n-c-o", "b a n c o", "b_a_n_c_o",
        "c.a.r.t.a.o", "c-a-r-t-a-o", "c a r t a o",
        "t.o.k.e.n", "t-o-k-e-n", "t o k e n"
    ]
    frases_base_sus = [
        "faz um {alvo} pra mim agora urgente",
        "manda esse {alvo} nessa chave",
        "preciso do seu {alvo} de seguranca",
        "qual é o seu {alvo} do cartao",
        "digita aqui o seu {alvo} que chegou no celular",
        "consegue me mandar um {alvo} hoje ainda",
        "transfere o {alvo} pra essa conta aqui",
        "{alvo} rapido pra mim que eu te devolvo amanha",
        "nao esquece de mandar o {alvo} antes das 16h",
        "me manda o {alvo} por favor pra eu resolver isso",
        "pode me passar o {alvo} sem falta",
        "envia o comprovante do {alvo} pelo chat",
        "digita os numeros do {alvo} para eu validar",
        "o atendente pediu seu {alvo} para confirmar",
        "libera o {alvo} para fazermos a transferencia"
    ]
    conectivos_sus = ["", " urgente!", " por favor??", " te pago depois.", " eh rapido!", " confia em mim...", " agora mesmo.", " antes que bloqueie!", " para resolver logo.", " sem enrolacao."]

    for al in palavras_ofuscadas:
        for fb in frases_base_sus:
            for con in conectivos_sus:
                frase = fb.format(alvo=al) + con
                pool_suspeitas.add(frase)
                pool_suspeitas.add(frase.capitalize())
                pool_suspeitas.add(f"Por favor: {frase}")

    lista_suspeitas = list(pool_suspeitas)
    random.shuffle(lista_suspeitas)
    for frase in lista_suspeitas[:1200]:
        data.append((frase, "MENSAGEM_SUSPEITA"))

    # =========================================================================
    # 4. SUBLIMACAO_MENSAGEM (Exatamente 1.200)
    # =========================================================================
    pool_sublimadas = set()
    lamentos_principais = [
        "Hoje é o dia mais triste da minha vida, não tenho nem um centavo para comprar comida",
        "Minha luz foi cortada hoje e vou ter que passar a noite inteira no escuro e no frio",
        "Não sei mais o que fazer, meu aluguel venceu e o proprietário vai colocar minhas coisas na rua amanhã",
        "Passei o dia com fome porque acabou o gás e a minha aposentadoria ainda não caiu",
        "Se eu tivesse apenas 180 reais eu comprava a injeção para aliviar essa dor insuportável",
        "Faltou tão pouco para eu conseguir pagar essa passagem e ir te ver, agora vou ter que esperar meses",
        "Estou chorando desesperada no quarto, me sinto tão sozinha sem ter ninguém para me estender a mão",
        "Minha geladeira quebrou e estragou toda a comida, não sei como vou alimentar meus netos hoje",
        "Acho que vou desistir de tudo, faltam só 250 reais para não apreenderem meu carro no financiamento",
        "Que humilhação ter que passar por isso nessa idade, se ao menos alguém me ajudasse com essa receita médica",
        "Cortei o almoço para conseguir comprar o remédio de pressão da semana",
        "A farmácia não quis fiar o remédio e estou com muita falta de ar",
        "Meu filho perdeu o emprego e hoje não temos nem o que pôr na mesa do jantar",
        "Se ao menos eu tivesse 200 reais eu não estaria nessa humilhação diante dos vizinhos",
        "Queria tanto poder te abraçar, mas não tenho nem como pagar o ônibus para sair do bairro",
        "O banco bloqueou minha conta do benefício e estou sem ter como comprar o pão de amanhã",
        "Estou com a água cortada faz dois dias, não tenho para quem pedir ajuda nessa cidade",
        "Fui despejada e estou com as malas na calçada sem saber onde vou dormir esta noite"
    ]
    segredos_apagar = [
        "Apaga essa nossa conversa depois que ler para ninguém se meter na nossa história",
        "Por favor, não mostre essas mensagens para os seus filhos, eles têm preconceito e vão estragar tudo",
        "Deleta esse histórico do seu telefone para ninguém ver o que a gente conversa",
        "Vamos manter isso em absoluto segredo entre nós dois, ninguém pode saber",
        "Apaga tudo do chat agora para a gente manter nossa privacidade protegida de curiosos",
        "Não comente com ninguém da sua família sobre a nossa conversa, prometa para mim",
        "Ativei as mensagens temporárias para que tudo se apague sozinho e não fique rastros",
        "Promete que vai apagar essa mensagem logo após ler? Não confio nos seus parentes",
        "Limpe o histórico de conversas do seu celular para evitar perguntas chatas da sua família",
        "Nosso relacionamento tem que ser em sigilo total, apague as mensagens após ler",
        "Delete essas mensagens assim que terminar de ler para resguardar nosso amor",
        "Não deixe ninguém pegar seu celular, apague o nosso chat por precaução"
    ]
    extensoes_sublimadas = [
        ", Deus sabe como meu coração está sofrendo.",
        ", ninguém se importa comigo de verdade...",
        ", só você para me ouvir e me dar carinho nesse momento tão difícil.",
        ", não sei até quando vou aguentar tanta dor e solidão.",
        ", queria tanto que você estivesse aqui para me salvar disso.",
        ", estou rezando para que um anjo apareça e me ajude.",
        ", se não fosse você eu nem sei o que seria de mim hoje.",
        ", sinto tanta vergonha de estar passando por isso sem saída.",
        ", a vida tem sido muito cruel comigo ultimamente.",
        ", guarde isso no seu coração e não comente com mais ninguém.",
        ", você é a minha única esperança nesse mundo.",
        ", reze por mim para que esse pesadelo acabe logo."
    ]

    for lam in lamentos_principais:
        for ext in extensoes_sublimadas:
            pool_sublimadas.add(f"{lam}{ext}")
            pool_sublimadas.add(f"É tão difícil: {lam.lower()}{ext}")
            pool_sublimadas.add(f"Infelizmente, {lam.lower()}{ext}")

    for seg in segredos_apagar:
        for ext in extensoes_sublimadas:
            pool_sublimadas.add(f"{seg}{ext}")
            pool_sublimadas.add(f"Meu bem, preste atenção: {seg.lower()}{ext}")
            pool_sublimadas.add(f"Por segurança: {seg.lower()}{ext}")

    for l in lamentos_principais:
        for s in segredos_apagar:
            pool_sublimadas.add(f"{l}. {s}.")
            pool_sublimadas.add(f"{s}. {l}.")

    lista_sublimadas = list(pool_sublimadas)
    random.shuffle(lista_sublimadas)
    for frase in lista_sublimadas[:1200]:
        data.append((frase, "SUBLIMACAO_MENSAGEM"))

    # =========================================================================
    # 5. AMEACA_EXTORSAO (Exatamente 1.200)
    # =========================================================================
    pool_extorsoes = set()
    personagens_ameaca = [
        "Sou o Delegado Roberto da Delegacia Especializada de Crimes Cibernéticos.",
        "Aqui é o Inspetor Marcos da Polícia Civil de Repressão aos Crimes Eletrônicos.",
        "Sou o Dr. Eduardo, advogado da família da jovem com quem você conversou.",
        "Aqui é o pai da moça menor de idade que você assediou com mensagens íntimas.",
        "Sou investigador da corregedoria policial e estou com seu mandado de prisão expedido.",
        "Aqui é da equipe de inteligência policial militar, rastreamos suas conversas.",
        "Sou perito judicial responsável pelo inquérito criminal instaurado contra seu CPF.",
        "Sou o delegado de plantão e acabei de lavrar o auto de prisão preventiva.",
        "Aqui é o capitão da polícia responsável pela operação contra assédio digital."
    ]
    ameacas_acao = [
        "Se você não pagar a fiança de R$ 3.000 agora, a viatura vai parar na porta da sua casa com sirene ligada.",
        "Vou enviar todas essas fotos e prints íntimos para a sua esposa, seus filhos e no Facebook da família.",
        "Seu nome e sua foto serão expostos publicamente na televisão e nos jornais locais por pedofilia.",
        "O mandado de prisão preventiva já foi assinado pelo juiz e você será preso em flagrante hoje.",
        "Vou vazar o print de todas as suas conversas indecentes para todos os membros da sua igreja.",
        "Ou você faz o Pix dessa indenização imediatamente ou vou acabar para sempre com a sua reputação.",
        "Nós sabemos o colégio onde seus netos estudam e o endereço onde você reside.",
        "Vamos encaminhar o processo para a empresa onde você trabalhou e expor seu crime aos seus amigos.",
        "Sua foto já está com os agentes nas ruas, pague a taxa de arquivamento ou aguarde o camburão.",
        "O oficial de justiça já está a caminho do seu bairro com os mandados de busca e apreensão."
    ]
    prazos_extorsao = [
        "Você tem exatamente 30 minutos para realizar a transferência antes do mandado ser cumprido.",
        "O prazo termina ao meio-dia, depois disso não tem mais conversa nem acordo extrajudicial.",
        "Faça o Pix agora mesmo nessa chave se quiser que o processo seja arquivado em sigilo absoluto.",
        "Pague os custos cartorários agora ou seus familiares receberão o dossiê completo hoje à tarde.",
        "Transfira o valor estipulado imediatamente para evitar escândalo e vergonha na sua vizinhança.",
        "Estou aguardando o comprovante de pagamento nos próximos 15 minutos sem desculpas.",
        "Pague a indenização prévia do dano moral agora ou assuma as consequências de uma prisão preventiva.",
        "Ou você resolve essa pendência financeira agora mesmo ou a cadeia é certa."
    ]

    for p in personagens_ameaca:
        for a in ameacas_acao:
            for pr in prazos_extorsao:
                pool_extorsoes.add(f"{p} {a} {pr}")
                pool_extorsoes.add(f"Urgente: {p} {a} {pr}")
                if len(pool_extorsoes) >= 2000:
                    break
            if len(pool_extorsoes) >= 2000:
                break
        if len(pool_extorsoes) >= 2000:
            break

    lista_extorsoes = list(pool_extorsoes)
    random.shuffle(lista_extorsoes)
    for frase in lista_extorsoes[:1200]:
        data.append((frase, "AMEACA_EXTORSAO"))

    # =========================================================================
    # 6. EMERGENCIA_FINANCEIRA (Exatamente 1.000)
    # =========================================================================
    pool_emergencias = set()
    acidentados = [
        "Meu neto sofreu um acidente grave de moto",
        "Minha mãe teve um infarto súbito e foi internada na UTI",
        "Bati o carro no meio da rodovia e o motor fundiu",
        "Fui assaltado à mão armada na rodoviária e levaram carteira, celular e documentos",
        "Minha filha está em trabalho de parto de emergência no hospital particular",
        "Meu irmão caiu do telhado e precisa operar a bacia com urgência",
        "Estou preso na serra com o carro fervendo e pneu furado sem assistência",
        "Minha tia idosa desmaiou e precisa de uma tomografia cerebral de emergência",
        "Tive um princípio de derrame e estou no pronto-socorro aguardando atendimento",
        "Fui roubado na viagem e não tenho dinheiro nem para pagar o hotel onde deixei as malas",
        "Minha esposa caiu na rua e fraturou o fêmur gravemente precisando de cirurgia",
        "Meu pai idoso teve um pico de pressão e precisa ser internado às pressas na UTI"
    ]
    pedidos_emerg = [
        "preciso pagar a caução de R$ 800 do hospital agora senão cancelam a internação",
        "o guincho está exigindo R$ 450 no Pix adiantado para tirar o carro da pista perigosa",
        "preciso de R$ 600 urgente para comprar a medicação controlada na farmácia de plantão",
        "não tenho como pagar a diária da clínica e estão ameaçando suspender os remédios",
        "estou na delegacia sem dinheiro da passagem e preciso de R$ 250 para conseguir voltar",
        "preciso de R$ 1.200 para a cirurgia de emergência antes das 18 horas para salvar o rim",
        "a ambulância particular está cobrando R$ 500 para fazer o translado imediato",
        "preciso pagar o anestesista no Pix agora para liberarem o centro cirúrgico"
    ]
    apelos = [
        "por favor me ajude pelo amor de Deus!",
        "é uma questão de vida ou morte!",
        "estou em desespero total sem saber a quem recorrer!",
        "assim que resolver essa tragédia eu te devolvo tudo sem falta!",
        "me salva dessa situação terrível por favor, estou chorando de pânico!",
        "tenha piedade da minha família nessa hora tão difícil!"
    ]

    for ac in acidentados:
        for pe in pedidos_emerg:
            for ap in apelos:
                pool_emergencias.add(f"{ac} e {pe}, {ap}")
                pool_emergencias.add(f"Socorro! {ac}, {pe}! {ap}")

    lista_emergencias = list(pool_emergencias)
    random.shuffle(lista_emergencias)
    for frase in lista_emergencias[:1000]:
        data.append((frase, "EMERGENCIA_FINANCEIRA"))

    # =========================================================================
    # 7. ENCOMENDA_TAXA (Exatamente 1.000)
    # =========================================================================
    pool_encomendas = set()
    itens_luxo = [
        "uma mala cheia de dólares e barras de ouro",
        "uma caixa com joias valiosas de família e um iPhone novo",
        "um pacote com 50 mil dólares em espécie e perfumes caros",
        "uma remessa diplomática com dinheiro e relógios de ouro",
        "uma encomenda internacional lacrada com presentes e dólares para nosso futuro",
        "um cofre com joias de esmeralda e certificados em moeda estrangeira",
        "um baú diplomático enviado da Inglaterra com documentos e herança em dinheiro",
        "uma mala com 100 mil euros que guardei durante anos de trabalho no exterior"
    ]
    problemas_alf = [
        "ficou retida na alfândega do aeroporto de Guarulhos",
        "a Receita Federal interceptou e exigiu o pagamento imediato de tributos aduaneiros",
        "o diplomata encarregado foi barrado pela polícia aduaneira em Curitiba",
        "a transportadora internacional DHL suspendeu a entrega por pendência fiscal",
        "a alfândega internacional reteve a carga exigindo o recolhimento da taxa aduaneira",
        "os agentes fiscais da aduana exigiram o pagamento da guia de importação",
        "o pacote foi confiscado temporariamente até a quitação da multa da Receita"
    ]
    solucoes_taxa = [
        "você precisa pagar a taxa de liberação de R$ 1.500 no Pix com urgência",
        "deposite a multa aduaneira de R$ 2.200 para o agente liberar a entrega na sua residência",
        "pague a guia fiscal de R$ 1.800 que a transportadora entrega a mala na sua porta hoje",
        "faça o Pix da taxa de desembaraço aduaneiro que eu te devolvo o triplo assim que desembarcar",
        "pague o valor da alfândega para eles não confiscarem todo o nosso patrimônio enviado",
        "pague a tarifa de liberação consular de R$ 2.500 para liberarem a entrega em domicílio"
    ]

    for it in itens_luxo:
        for pr in problemas_alf:
            for sol in solucoes_taxa:
                pool_encomendas.add(f"Enviei {it} para você, mas {pr}, {sol}.")
                pool_encomendas.add(f"Atenção meu bem: {it} {pr}. Por favor, {sol}.")
                pool_encomendas.add(f"Meu amor, mandei {it} com carinho, só que {pr}. Você consegue {sol.lower()}?")

    lista_encomendas = list(pool_encomendas)
    random.shuffle(lista_encomendas)
    for frase in lista_encomendas[:1000]:
        data.append((frase, "ENCOMENDA_TAXA"))

    # =========================================================================
    # 8. INVESTIMENTO_SUSPEITO (Exatamente 1.000)
    # =========================================================================
    pool_investimentos = set()
    introducoes_inv = [
        "Eu posso te ensinar a faturar muito dinheiro com",
        "Meu tio em Londres me passou um método infalível de",
        "Tenho uma oportunidade incrível e exclusiva para",
        "Descobri uma plataforma automatizada para",
        "Estou lucrando todos os dias operando com",
        "Você pode triplicar a sua aposentadoria se começar a",
        "Eu vivo exclusivamente de lucros obtidos ao",
        "Conheci um investidor suíço que me ensinou a",
        "Existe uma brecha no mercado financeiro para",
        "Te mostro o passo a passo seguro para",
        "Uma amiga corretora me ensinou a fórmula de",
        "Comecei a ter uma renda passiva fantástica ao"
    ]
    ativos_inv = [
        "investir em criptomoedas na corretora Binance clonada",
        "comprar Tether USDT na plataforma internacional de arbitragem",
        "operar no mercado de Forex com robô automatizado de alta precisão",
        "comprar Bitcoin com sinal privilegiado da corretora estrangeira",
        "investir em derivativos de ouro digital com rendimento diário",
        "aplicar em contratos futuros de criptoativos com inteligência artificial",
        "fazer operações de swap de moedas com garantia de liquidez diária",
        "operar fundos de liquidez sintética em exchanges descentralizadas"
    ]
    promessas_inv = [
        "rendendo 5% ao dia garantido sem nenhum risco de perda.",
        "com retorno imediato e você pode sacar os lucros na mesma hora.",
        "lucro certo de 100% em menos de duas semanas de aplicação.",
        "rendimento mensal garantido muito superior à poupança e ao CDB.",
        "uma renda passiva de R$ 500 por dia com investimento inicial mínimo.",
        "onde você coloca R$ 300 hoje e resgata R$ 1.500 no final da semana.",
        "sem nenhuma burocracia e com rentabilidade fixa comprovada em contrato.",
        "podendo sacar seus rendimentos em reais direto na conta todo dia."
    ]

    for ii in introducoes_inv:
        for at in ativos_inv:
            for pi in promessas_inv:
                pool_investimentos.add(f"{ii} {at}, {pi}")
                pool_investimentos.add(f"Não perca essa chance meu bem: {ii.lower()} {at} {pi}")
                pool_investimentos.add(f"Oportunidade única: {ii.lower()} {at}. {pi}")

    lista_investimentos = list(pool_investimentos)
    random.shuffle(lista_investimentos)
    for frase in lista_investimentos[:1000]:
        data.append((frase, "INVESTIMENTO_SUSPEITO"))

    # =========================================================================
    # 9. LINK_MALICIOSO (Exatamente 1.000)
    # =========================================================================
    pool_links = set()
    chamadas_link = [
        "Clica nesse link aqui para ver as fotos:",
        "Entra nessa página para confirmar seu cadastro:",
        "Acesse esse site para ver o comprovante de envio:",
        "Baixe esse aplicativo seguro no seu celular:",
        "Clica aqui agora para validar seu benefício:",
        "Abra esse endereço no seu navegador do celular:",
        "Veja os detalhes nesse link protegido:",
        "Acesse o link abaixo para confirmar nossa chamada de vídeo:",
        "Entre no portal pelo link para agendar nossa viagem:",
        "Confira o álbum exclusivo clicando no endereço abaixo:"
    ]
    urls_suspeitas = [
        "bit.ly/fotos-privadas-2026", "t.me/chat-vip-oficial", "cartorio-digital-online.com/validar-doc",
        "meu-banco-seguro-app.net/login", "atualizacao-conta-bradesco.online", "aplicativo-conversa-segura.apk",
        "fotos-familia-album.com/download.apk", "tinyurl.com/acesso-restrito-beneficio", "is.gd/chat-secreto-privado",
        "painel-seguranca-beneficiario.cc", "recadastramento-inss-urgente.org", "valida-documento-tabeliao.info"
    ]
    urgencias_link = [
        "é rápido e seguro!", "não demora nem um minuto.", "senão vai expirar em poucas horas.",
        "para liberar nossa conversa privativa.", "preciso que você confirme logo.",
        "antes que o link seja desativado pelo sistema.", "para eu conseguir te ligar com vídeo hoje.",
        "é só clicar e baixar no seu aparelho.", "assim você já vê tudo na tela.", "para validar com sucesso."
    ]

    for cl in chamadas_link:
        for us in urls_suspeitas:
            for ul in urgencias_link:
                pool_links.add(f"{cl} https://{us} {ul}")
                pool_links.add(f"{cl} http://{us}, {ul}")
                if len(pool_links) >= 1500:
                    break
            if len(pool_links) >= 1500:
                break
        if len(pool_links) >= 1500:
            break

    lista_links = list(pool_links)
    random.shuffle(lista_links)
    for frase in lista_links[:1000]:
        data.append((frase, "LINK_MALICIOSO"))

    # =========================================================================
    # 10. FALSA_DOACAO_HERANCA (Exatamente 800)
    # =========================================================================
    pool_doacoes = set()
    origens_doa = [
        "Sou viúva e não tenho herdeiros no exterior",
        "Fui diagnosticada com câncer em fase terminal e tenho uma fortuna acumulada",
        "Sou advogado responsável pelo espólio de um cliente bilionário falecido",
        "Deus tocou no meu coração para doar todos os meus bens a uma pessoa cristã",
        "Represento uma fundação humanitária internacional na Suíça sem fins lucrativos",
        "Herdei um patrimônio milionário em Londres mas não tenho familiares vivos",
        "Sou médico aposentado na França e quero destinar meus bens a pessoas humildes",
        "Fui abençoado financeiramente na vida e decidi fazer uma caridade substancial"
    ]
    valores_doa = [
        "e decidi doar 500 mil dólares para você administrar",
        "e escolhi você para receber uma herança de 1 milhão de euros",
        "e quero transferir 800 mil dólares para sua conta bancária no Brasil",
        "para destinar fundos de caridade de R$ 2.500.000 para obras sociais sob seus cuidados",
        "e reservei 300 mil libras esterlinas para colocar no seu nome",
        "e elegi seu perfil para receber todo o saldo remanescente das contas bancárias"
    ]
    condicoes_doa = [
        "mas você precisa pagar a taxa de transferência cartorária de R$ 850 antecipada.",
        "envie apenas o valor de R$ 1.200 dos impostos consulares para liberação da remessa.",
        "basta depositar as custas judiciais internacionais de R$ 950 para receber o alvará.",
        "pague a taxa do tabelião em Londres no valor de R$ 1.500 para liberar o depósito no seu banco.",
        "você só precisa arcar com a tarifa de registro diplomático de R$ 1.100 para receber a doação.",
        "faça o Pix da guia de homologação da herança para que o banco britânico libere os fundos."
    ]

    for od in origens_doa:
        for vd in valores_doa:
            for cd in condicoes_doa:
                pool_doacoes.add(f"{od} {vd}, {cd}")
                pool_doacoes.add(f"Mensagem de fé: {od.lower()} {vd}, {cd}")
                pool_doacoes.add(f"Com a bênção de Deus: {od.lower()} {vd}. Por favor, {cd}")

    lista_doacoes = list(pool_doacoes)
    random.shuffle(lista_doacoes)
    for frase in lista_doacoes[:800]:
        data.append((frase, "FALSA_DOACAO_HERANCA"))

    # =========================================================================
    # 11. PEDIDO_CREDENCIAL (Exatamente 800)
    # =========================================================================
    pool_credenciais = set()
    pedidos_cred = [
        "Me passa o código de 6 dígitos que chegou por SMS no seu celular",
        "Qual é o número do CVV de segurança que fica atrás do seu cartão de crédito",
        "Me manda uma foto nítida da frente e do verso do seu cartão do banco",
        "Digita aqui a sua senha de 4 dígitos do aplicativo bancário",
        "Preciso que você me informe o código de verificação do WhatsApp que chegou aí",
        "Qual o seu token de segurança do banco que apareceu na tela do celular agora",
        "Me manda a foto do seu documento de identidade com CPF frente e verso",
        "Qual a sua senha de 6 dígitos que você usa para fazer transferências no caixa eletrônico",
        "Digita os números completos do seu cartão e a validade com mês e ano",
        "Me passa o código de autenticação de dois fatores que você recebeu por mensagem"
    ]
    motivos_cred = [
        "para eu conseguir validar a nossa chamada de vídeo pelo sistema.",
        "para liberar o cadastro do aplicativo de chamadas gratuitas.",
        "para eu confirmar o pagamento da reserva da nossa viagem na maquininha.",
        "porque o sistema de segurança do banco bloqueou e pediu confirmação.",
        "para eu agendar a sua passagem aérea e reservar a van.",
        "para validar sua assinatura no cartório digital de forma segura.",
        "para comprovar que a sua linha telefônica está ativa e habilitada.",
        "para que eu consiga desativar o bloqueio de segurança do servidor."
    ]
    garantias_cred = [
        "pode confiar em mim meu bem, é 100% seguro.",
        "é rapidinho, faz agora por favor antes que expire.",
        "preciso disso urgente antes que o código perca a validade de 5 minutos.",
        "não tem perigo nenhum meu anjo, sou eu quem estou pedindo.",
        "assim que eu digitar aqui o sistema libera a nossa ligação.",
        "faça isso agora mesmo para a gente não perder a viagem agendada."
    ]

    for pc in pedidos_cred:
        for mc in motivos_cred:
            for gc in garantias_cred:
                pool_credenciais.add(f"{pc} {mc} {gc}")
                pool_credenciais.add(f"Por favor: {pc.lower()}, {mc} {gc}")

    lista_credenciais = list(pool_credenciais)
    random.shuffle(lista_credenciais)
    for frase in lista_credenciais[:800]:
        data.append((frase, "PEDIDO_CREDENCIAL"))

    # =========================================================================
    # 12. SONDAGEM_FINANCEIRA (Exatamente 800)
    # =========================================================================
    pool_sondagens = set()
    perguntas_son = [
        "Você mora em casa própria quitada ou paga aluguel todos os meses?",
        "Sua aposentadoria do INSS é integral ou você recebe apenas um salário mínimo?",
        "Qual é o limite disponível atualmente no seu cartão de crédito do banco?",
        "Você tem algum dinheiro guardado na poupança, tesouro direto ou aplicação?",
        "Os seus filhos dependem financeiramente de você ou você mora sozinha e livre?",
        "Você recebe pensão por morte ou algum outro benefício previdenciário do governo?",
        "Você tem carro próprio quitado ou algum imóvel comercial no seu nome?",
        "Você tem investimentos em ações, fundos imobiliários ou previdência privada?",
        "Quanto costuma sobrar da sua renda livre ao final de cada mês?",
        "Qual banco você tem conta aberta e movimenta seus recebimentos principais?"
    ]
    pretextos_son = [
        "estou perguntando para a gente planejar o nosso futuro morando juntos.",
        "é só para eu saber do seu padrão de vida e se combina com o meu.",
        "assim a gente já planeja a compra de uma chácara para nós dois.",
        "para quando eu me mudar em definitivo para o Brasil e viver ao seu lado.",
        "só por curiosidade para eu conhecer melhor a sua rotina financeira.",
        "porque quero te ajudar a administrar melhor os seus recursos.",
        "para saber se podemos viajar para o exterior nas férias de fim de ano.",
        "porque em um relacionamento sincero não devemos esconder nada sobre bens."
    ]
    complementos_son = [
        "Fique tranquila para me responder.",
        "Pode falar abertamente comigo meu amor.",
        "É importante sabermos disso desde já.",
        "Depois eu te conto tudo sobre os meus bens também.",
        "Quero cuidar bem de você quando estivermos juntos.",
        "Confiança mútua é a base de tudo entre nós."
    ]

    for ps in perguntas_son:
        for prs in pretextos_son:
            for cs in complementos_son:
                pool_sondagens.add(f"{ps} {prs.capitalize()} {cs}")
                pool_sondagens.add(f"Meu bem, {ps.lower()} {prs.capitalize()} {cs}")

    lista_sondagens = list(pool_sondagens)
    random.shuffle(lista_sondagens)
    for frase in lista_sondagens[:800]:
        data.append((frase, "SONDAGEM_FINANCEIRA"))

    # =========================================================================
    # 13. FALSO_INTERMEDIARIO (Exatamente 800)
    # =========================================================================
    pool_intermediarios = set()
    parentes_inter = [
        "do seu filho Marcos", "do seu neto Pedro", "da sua filha Juliana",
        "do seu sobrinho Lucas", "da sua neta Beatriz", "do seu genro Carlos",
        "do seu afilhado Gabriel", "da sua sobrinha Fernanda"
    ]
    profissoes_inter = [
        "Sou o mecânico que está atendendo o carro quebrado",
        "Sou o policial rodoviário que está prestando os primeiros socorros",
        "Sou o amigo da faculdade que está viajando junto",
        "Sou o motorista do guincho que rebocou o veículo na pista",
        "Sou o atendente da recepção do hospital que recebeu",
        "Sou o borracheiro do posto de gasolina onde parou",
        "Sou o colega de trabalho que socorreu na rua"
    ]
    situacoes_inter = [
        "ele ficou sem bateria no telefone no meio da estrada e precisa de R$ 350 no Pix para o conserto urgente.",
        "ele perdeu a carteira com todos os cartões e pediu para a senhora fazer um Pix de R$ 400 para comprar a passagem de volta.",
        "ele sofreu um imprevisto na viagem e pediu para transferir R$ 500 para essa chave agora para liberar o combustível.",
        "o cartão dele foi bloqueado no posto e ele precisa de R$ 280 no Pix para pagar as despesas e voltar para casa.",
        "o pneu furou e rasgou na rodovia e ele precisa de R$ 320 para pagar o borracheiro que está no local.",
        "ele teve a bolsa furtada no terminal rodoviário e pediu para a senhora socorrer com R$ 450 no Pix dessa chave."
    ]
    urgencias_inter = [
        "Por favor dona Maria, faça o Pix agora nessa chave para ele não ficar desamparado na escuridão.",
        "Ele está desesperado aqui do meu lado sem sinal de operadora pedindo a sua ajuda urgente.",
        "Assim que ele chegar em casa ele devolve o dinheiro e liga para a senhora com calma.",
        "É rápido, basta transferir para a chave que passei que eu já libero ele aqui agora mesmo.",
        "Ele me deu o telefone da senhora como único contato de confiança para resolver essa emergência."
    ]

    for pi in parentes_inter:
        for pro in profissoes_inter:
            for si in situacoes_inter:
                for ui in urgencias_inter:
                    pool_intermediarios.add(f"Dona Maria, {pro} {pi}. {si} {ui}")
                    pool_intermediarios.add(f"Oi tia, {pro.lower()} {pi}, {si} {ui}")
                    if len(pool_intermediarios) >= 1200:
                        break
                if len(pool_intermediarios) >= 1200:
                    break
            if len(pool_intermediarios) >= 1200:
                break
        if len(pool_intermediarios) >= 1200:
            break

    lista_intermediarios = list(pool_intermediarios)
    random.shuffle(lista_intermediarios)
    for frase in lista_intermediarios[:800]:
        data.append((frase, "FALSO_INTERMEDIARIO"))

    # =========================================================================
    # Finalização e Embaralhamento
    # =========================================================================
    random.shuffle(data)
    print(f"Total de frases prontas no dataset: {len(data)}")

    with open('dataset.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['texto', 'label'])
        writer.writerows(data)

    print("Arquivo 'dataset.csv' gerado com sucesso!")

if __name__ == "__main__":
    generate_full_dataset()
