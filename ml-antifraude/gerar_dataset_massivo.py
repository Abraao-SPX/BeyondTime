import csv
import os
import random

random.seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")


def sample_pool(pool, target, label):
    items = sorted(pool)
    if len(items) < target:
        raise ValueError(
            f"Pool insuficiente para '{label}': {len(items)} disponíveis, {target} necessários."
        )
    random.shuffle(items)
    return [(frase, label) for frase in items[:target]]


def generate_full_dataset():
    data = []

    # =========================================================================
    # 1. NORMAL (11.000 frases — 7.500 cotidiano/afeto/curtas + 3.500 hard negatives)
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
        "Com carinho e consideração, desejo tudo de bom para você",
    ]

    sujeitos_norm = [
        "Eu", "Meu filho", "Minha filha", "Minha neta", "Meu neto",
        "Minha vizinha", "Meu irmão", "Minha irmã", "Nós", "A família toda",
        "Eu e minha comadre", "Eu e meus amigos", "Meu cunhado", "Minha sobrinha",
    ]
    verbos_norm = [
        "fomos caminhar na praça", "fomos ao supermercado fazer a compra do mês",
        "almoçamos juntos domingo", "fizemos um café da tarde delicioso",
        "assistimos a missa pela televisão", "viajamos para a chácara no interior",
        "fomos na igreja agradecer pelas graças", "conversamos bastante na varanda",
        "limpamos o quintal e cuidamos das plantas", "fomos na feira comprar verduras frescas",
        "fizemos um bolo de fubá quentinho", "fomos ao médico fazer exames de rotina",
        "levamos os cachorros para passear", "fomos tomar um sorvete no centro",
        "bordamos uma toalha de mesa linda", "preparamos o almoço com muito carinho",
        "escutamos músicas antigas dos anos 70", "fomos pagar as contas de água e luz no banco",
        "compramos sementes para a horta comunitária", "assistimos ao jornal e conversamos sobre a vida",
        "caminhamos na orla aproveitando o sol da manhã", "fomos ao parque ver o pôr do sol",
        "lemos um livro muito bonito na sala", "preparamos cuscuz com queijo para o café",
        "organizamos os álbuns de fotos antigas", "fomos visitar a padaria nova do bairro",
        "jogamos dominó e demos muitas risadas", "fizemos pão caseiro quentinho com manteiga",
    ]
    tempos_norm = [
        "ontem à tarde", "hoje de manhã cedo", "no último sábado",
        "neste final de semana", "na segunda-feira passada", "no início da semana",
        "agora pouco", "ao entardecer", "durante a manhã", "depois do almoço",
        "no domingo passado", "hoje depois do café", "na sexta à noite", "nesta quinta-feira",
    ]
    fechamentos_norm = [
        "e foi muito agradável.", "graças a Deus.", "com as bênçãos do Senhor.",
        "para descansar a cabeça.", "e tudo correu em paz.", "aproveitando a brisa fresca.",
        "e matamos a saudade.", "foi uma tarde muito feliz.", "e estava tudo uma delícia.",
        "como sempre fazemos com calma.", "e voltamos renovados.", "com muita alegria no coração.",
    ]

    # Frases curtas e naturais de conversa diária
    aberturas_curtas = [
        "Oi,", "Olá,", "Bom dia,", "Boa tarde,", "Boa noite,",
        "Tudo bem?", "Que alegria,", "Pois é,", "Verdade,", "Nossa,",
    ]
    meios_curtos = [
        "como está o tempo por aí hoje", "já tomou seu cafezinho da tarde",
        "adorei a sua foto sorrindo no perfil", "gosto muito de caminhar de manhã cedo",
        "acabei de preparar um bolo de cenoura", "estou ouvindo músicas antigas aqui na sala",
        "vou almoçar agora e depois te respondo", "podemos marcar um café no shopping no sábado",
        "estou cuidando das minhas orquídeas no quintal", "que cidade bonita onde você mora",
        "estou assistindo à novela aqui bem tranquilo", "muito obrigado pela educação e gentileza",
        "gostei muito da nossa conversa de ontem", "estou bem sim graças a Deus",
        "vamos conversar mais tarde com calma", "qual livro ou filme você mais gosta",
        "hoje dormi super bem e acordei animado", "a brisa da tarde está maravilhosa hoje",
    ]
    fins_curtos = [
        "!", ".", " meu amigo.", " querida.", " querido.", " viu?", " por aqui tudo em paz.",
    ]

    pool_normal = set()
    for s in saudacoes:
        pool_normal.add(s + ".")
        for f in fechamentos_norm:
            pool_normal.add(f"{s}, {f.lower()}")

    for ab in aberturas_curtas:
        for mc in meios_curtos:
            for fc in fins_curtos:
                pool_normal.add(f"{ab} {mc}{fc}")

    for su in sujeitos_norm:
        for v in verbos_norm:
            for t in tempos_norm:
                for f in fechamentos_norm:
                    pool_normal.add(f"{su} {v} {t} {f}")
                    pool_normal.add(f"{t.capitalize()}, {su.lower()} {v} {f}")
                    if len(pool_normal) >= 12000:
                        break
                if len(pool_normal) >= 12000:
                    break
            if len(pool_normal) >= 12000:
                break
        if len(pool_normal) >= 12000:
            break

    # Hard negatives: mencionam banco, INSS, Pix, médico, encomenda, advogado, emprego sem golpe
    hard_negatives_suj = [
        "Hoje eu", "Ontem eu", "Esta semana eu", "De manhã eu",
        "Meu filho", "Minha filha", "Minha irmã", "Meu vizinho",
        "Meu neto", "Minha neta", "Meu irmão", "Eu e minha família",
    ]
    hard_negatives_acoes = [
        "fui pessoalmente à agência do banco atualizar o cadastro",
        "consultei o extrato do INSS direto no aplicativo oficial Meu INSS",
        "paguei a conta de luz e o boleto do condomínio no caixa",
        "recebi a encomenda da farmácia que eu mesmo comprei ontem",
        "fui ao médico fazer check-up e os exames saíram ótimos",
        "troquei de celular e liguei por chamada de vídeo para a família",
        "consegui uma vaga de trabalho ótima perto de casa",
        "vi uma reportagem no jornal sobre segurança digital para idosos",
        "paguei o almoço no restaurante usando Pix na maquininha",
        "conversei com o advogado pessoalmente no escritório dele no centro",
        "assisti a um vídeo de receita de pão caseiro no YouTube",
        "comprei presentes para os meus netos na loja do shopping",
        "resolvi a prova de vida direto no banco com a gerente",
        "recebi o benefício da aposentadoria certinho na conta hoje",
        "fiz a revisão do carro na oficina de confiança do bairro",
        "bloqueei um número desconhecido que tentou me ligar hoje cedo",
        "ativei a verificação em duas etapas no meu celular para ficar seguro",
        "fui aos Correios buscar o livro que encomendei mês passado",
        "conversei com meu neto por vídeo e combinamos o almoço de domingo",
        "falei com a gerente na agência sobre a poupança e o cartão",
        "paguei o conserto do portão usando cartão na maquininha",
        "acompanhei o rastreio do pedido que fiz no site oficial da loja",
        "cancelei um cartão antigo diretamente dentro da agência bancária",
        "ajudei minha sobrinha a organizar os documentos da faculdade",
        "ouvi na rádio orientações da Febraban contra golpes por telefone",
        "fiz uma chamada de vídeo com meu filho para confirmar a viagem dele",
        "saquei o dinheiro da feira no caixa eletrônico acompanhado da minha filha",
        "recebi o comprovante oficial da prefeitura no posto de atendimento",
        "conferi a fatura do cartão no aplicativo oficial do meu banco",
        "fui ao cartório do centro reconhecer firma pessoalmente",
    ]
    hard_negatives_fins = [
        "e deu tudo certo.", "com muita tranquilidade.", "sem nenhum problema.",
        "e fiquei muito aliviado.", "bem pertinho de casa.", "e já voltei para descansar.",
        "graças a Deus.", "e depois fui tomar um café.", "com total segurança.",
        "e o atendimento foi excelente.", "ainda antes do almoço.", "bem rapidinho.",
    ]

    pool_hard_neg = set()
    for su in hard_negatives_suj:
        for ac in hard_negatives_acoes:
            for fn in hard_negatives_fins:
                pool_hard_neg.add(f"{su} {ac} {fn}")
                pool_hard_neg.add(f"Graças a Deus, {su.lower()} {ac} {fn}")

    data.extend(sample_pool(pool_normal, 7500, "NORMAL"))
    data.extend(sample_pool(pool_hard_neg, 3500, "NORMAL"))

    # =========================================================================
    # 2. PEDIDO_DINHEIRO (4.200 frases — 1.800 direto + 2.400 novos/curtos)
    # =========================================================================
    pool_pedidos = set()
    verbos_ped = [
        "Você consegue me fazer um pix de", "Pode me transferir", "Tem como me emprestar",
        "Faz um pix rápido de", "Manda para minha chave pix", "Transfere agora",
        "Consegue depositar", "Pode me mandar um valor de", "Você me socorre com um pix de",
        "Tem como me adiantar", "Consegue mandar um dinheiro de", "Faz uma transferência de",
    ]
    valores_ped = [
        "R$ 80", "R$ 150", "200 reais", "R$ 250", "300 reais", "R$ 350",
        "400 reais", "R$ 500", "600 reais", "R$ 750", "800 reais", "1.000 reais",
        "R$ 1.200", "1.500 reais", "essa quantia de R$ 300", "esse dinheiro de 450 reais",
    ]
    motivos_ped = [
        "para pagar uma conta de água que vence hoje", "porque meu salário atrasou este mês",
        "para liberar meu limite do cartão", "porque esqueci minha senha no banco",
        "para cobrir o saldo devedor", "para inteirar um pagamento urgente",
        "porque deu problema no aplicativo do meu banco", "para pagar uma taxa imprevista no cartório",
        "para comprar o gás que acabou agora", "para pagar o mecânico que terminou a revisão",
        "para pagar um boleto que vence às 17h", "porque meu cartão bloqueou na hora de pagar",
    ]
    garantias_ped = [
        "te devolvo amanhã cedo sem falta.", "segunda-feira te pago com juros.",
        "assim que meu dinheiro cair eu te mando de volta.", "prometo que devolvo tudo até sexta.",
        "te pago o dobro semana que vem.", "minha palavra vale ouro, te devolvo logo.",
        "amanhã meio-dia o valor já estará na sua conta.", "pode confiar, nunca deixei de pagar ninguém.",
        "te compenso pelo favor assim que receber.", "é só até meu filho fazer a transferência para mim.",
    ]

    for v in verbos_ped:
        for val in valores_ped:
            for mot in motivos_ped:
                for gar in garantias_ped:
                    pool_pedidos.add(f"{v} {val} {mot}, {gar}")
                    pool_pedidos.add(f"Por favor, {v.lower()} {val}? É {mot}. {gar}")
                    if len(pool_pedidos) >= 5000:
                        break
                if len(pool_pedidos) >= 5000:
                    break
            if len(pool_pedidos) >= 5000:
                break
        if len(pool_pedidos) >= 5000:
            break

    pool_pedidos_novos = set()

    # 2A. Golpe do Pix errado / falsa devolução para conta laranja
    pix_errado_aberturas = [
        "Oi, acabei de fazer um Pix errado para sua conta por engano",
        "Desculpa incomodar, transferi um dinheiro errado pro seu CPF agora",
        "Fiz um Pix por engano para o seu número sem querer",
        "Errei um dígito da chave Pix e o valor caiu na sua conta",
        "Mandei um depósito errado na sua conta agora pouco",
        "Por favor me ajude, digitei o telefone errado no Pix e foi pra você",
        "Transferi sem querer o dinheiro do aluguel para sua chave Pix",
        "Caiu um Pix meu na sua conta por descuido agora",
    ]
    pix_errado_vals = ["de R$ 250", "de R$ 400", "de R$ 600", "de R$ 850", "de R$ 1.200", "de 350 reais", "de 500 reais", "de 900 reais"]
    pix_errado_pedidos = [
        "por favor devolve para essa outra chave Pix aqui urgente!",
        "manda de volta nessa chave do meu irmão porque minha conta está bloqueada.",
        "faz a devolução via Pix para esse CPF que vou te passar agora, é dinheiro de remédio.",
        "não usa a opção de devolver do banco, transfere direto para essa chave Pix alternativa.",
        "me devolve agora nessa outra conta senão vou registrar boletim de ocorrência.",
        "transfere de volta para a chave do meu filho que vou mandar aqui embaixo.",
        "devolve rapidinho nessa outra chave Pix porque estou na fila do hospital.",
        "manda o estorno para essa conta aqui que a minha antiga foi encerrada hoje.",
    ]
    for a in pix_errado_aberturas:
        for pv in pix_errado_vals:
            for p in pix_errado_pedidos:
                pool_pedidos_novos.add(f"{a} {pv}, {p}")
                pool_pedidos_novos.add(f"Urgente: {a.lower()} {pv}, {p}")

    # 2B. Falsa vaga de emprego com taxa antecipada
    vagas_aberturas = [
        "Parabéns! Você foi aprovado na vaga de assistente home office com salário de R$ 4.200",
        "Seu currículo foi selecionado para vaga remota na nossa empresa com início imediato",
        "Vaga urgente de atendimento digital trabalhando de casa ganhando R$ 3.800 por mês",
        "Você passou na entrevista online para auxiliar administrativo remoto",
        "Temos uma vaga garantida sem experiência com registro em carteira e ótimo salário",
        "RH informa: sua contratação em home office com vale-alimentação foi aprovada hoje",
        "Oportunidade imediata de emprego remoto meio período ganhando R$ 2.900 fixos",
        "Você foi escolhido para a vaga de digitador online com início amanhã",
    ]
    vagas_taxas = [
        "para concluir a contratação pague a taxa do exame admissional de R$ 180 via Pix",
        "basta pagar a emissão do certificado obrigatório de R$ 150 no Pix para começar amanhã",
        "envie R$ 220 no Pix referente ao kit de trabalho e uniforme",
        "transfira R$ 120 de taxa de documentação admissional nessa chave Pix",
        "faça o Pix da inscrição do treinamento obrigatório de R$ 190 agora",
        "pague a taxa do crachá e abertura de folha salarial de R$ 160 via Pix",
        "deposite R$ 250 pelo Pix para emissão do contrato digital registrado",
        "quite a guia do curso preparatório obrigatório de R$ 140 no Pix",
    ]
    vagas_fins = [
        "que devolvemos no primeiro salário.", "para não perder a vaga hoje.",
        "antes das 17h sem falta.", "e já enviamos o notebook da empresa.",
        "para liberar seu acesso ao sistema.", "pois restam apenas duas vagas.",
    ]
    for va in vagas_aberturas:
        for vt in vagas_taxas:
            for vf in vagas_fins:
                pool_pedidos_novos.add(f"{va}, {vt} {vf}")

    # 2C. Falsa central pedindo Pix de estorno/conta segura & falso consignado
    central_pix_aberturas = [
        "Aqui é da central de segurança do banco, detectamos um Pix fraudulento na sua conta",
        "Para cancelar a compra suspeita de R$ 2.500 no seu cartão agora mesmo",
        "Seu banco identificou uma invasão e liberou o protocolo de estorno emergencial",
        "Transferimos um empréstimo consignado do INSS por engano para a sua conta",
        "Para cancelar o empréstimo consignado feito sem sua autorização hoje",
        "Departamento antifraude do banco avisando sobre tentativa de saque na sua conta",
        "Foi liberado um crédito consignado indevido no seu benefício previdenciário",
        "Protocolo de emergência bancária para bloquear uma transferência não reconhecida",
    ]
    central_pix_acoes = [
        "faça um Pix de teste no mesmo valor para essa conta segura do Banco Central",
        "transfira todo o saldo disponível via Pix para a conta protegida de estorno agora",
        "devolva o valor via Pix para essa chave do setor financeiro para cancelar o contrato",
        "realize um Pix de validação imediato para bloquear o fraudador",
        "envie o valor do saldo nessa chave de segurança para espelhamento bancário",
        "faça uma transferência Pix reversa para a conta cofre do banco",
        "transfira R$ 1.500 via Pix para gerar o código de cancelamento automático",
        "mande o valor do empréstimo nessa chave Pix de devolução sem juros",
    ]
    central_pix_fins = [
        "que o sistema estorna em 5 minutos.", "antes que o golpe seja concluído.",
        "para proteger sua aposentadoria hoje.", "e receba o comprovante de estorno imediato.",
        "sem desligar o atendimento.", "com garantia total da central.",
    ]
    for ca in central_pix_aberturas:
        for cp in central_pix_acoes:
            for cf in central_pix_fins:
                pool_pedidos_novos.add(f"{ca}: {cp} {cf}")

    # 2D. Frases curtas e coloquiais de pedido de dinheiro/Pix
    curtas_ped_inicio = [
        "Me faz um pix de", "Consegue mandar", "Empresta", "Passa",
        "Paga esse boleto de", "Me socorre com", "Manda um pix de",
        "Tem como transferir", "Pode depositar", "Faz um favor e manda",
        "Tô precisando de", "Me ajuda com um pix de",
    ]
    curtas_ped_val = [
        "50 reais", "80 reais", "100 reais", "150 reais", "200 reais",
        "250 reais", "300 reais", "400 reais", "500 reais", "650 reais",
        "800 reais", "R$ 120", "R$ 350", "R$ 1.000",
    ]
    curtas_ped_fim = [
        "pra mim agora?", "urgente que amanhã devolvo!", "nessa chave pix por favor",
        "rapidinho que meu app travou", "hoje ainda, te pago sexta",
        "que meu limite estourou aqui", "pra cobrir uma conta hoje",
        "que mais tarde te devolvo certinho", "nessa conta aqui por gentileza",
        "só até cair meu pagamento", "agora mesmo que vence já já",
        "pra eu resolver um pepino aqui",
    ]
    for ci in curtas_ped_inicio:
        for cv in curtas_ped_val:
            for cf in curtas_ped_fim:
                pool_pedidos_novos.add(f"{ci} {cv} {cf}")

    data.extend(sample_pool(pool_pedidos, 1800, "PEDIDO_DINHEIRO"))
    data.extend(sample_pool(pool_pedidos_novos, 2400, "PEDIDO_DINHEIRO"))

    # =========================================================================
    # 3. MENSAGEM_SUSPEITA (3.400 frases — 2.200 ofuscação + 1.200 migração)
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
        "t.o.k.e.n", "t-o-k-e-n", "t o k e n",
        "g.o.v.b.r", "g-o-v-b-r", "a.n.y.d.e.s.k", "a-n-y-d-e-s-k", "w.h.a.t.s", "z.a.p",
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
        "libera o {alvo} para fazermos a transferencia",
        "escreve o {alvo} separado para o app nao bloquear",
    ]
    conectivos_sus = [
        "", " urgente!", " por favor??", " te pago depois.", " eh rapido!",
        " confia em mim...", " agora mesmo.", " antes que bloqueie!",
        " para resolver logo.", " sem enrolacao.",
    ]

    for al in palavras_ofuscadas:
        for fb in frases_base_sus:
            for con in conectivos_sus:
                frase = fb.format(alvo=al) + con
                pool_suspeitas.add(frase)
                pool_suspeitas.add(frase.capitalize())

    pool_migracao = set()
    mig_chamadas = [
        "Vamos sair desse aplicativo e conversar no WhatsApp",
        "Me passa seu número do zap agora",
        "Me chama no Telegram ou no WhatsApp privado",
        "Não gosto de conversar por aqui, me dá seu telefone particular",
        "Vamos migrar a conversa para o meu WhatsApp pessoal",
        "Me adiciona no zap que eu quase não entro aqui",
        "Passa seu WhatsApp pra gente sair desse chat monitorado",
        "Troca o papo pro Telegram comigo agora",
        "Manda seu número com DDD para falarmos fora do aplicativo",
        "Me chama no meu número particular do WhatsApp hoje",
    ]
    mig_motivos = [
        "porque esse aplicativo trava muito e vive caindo.",
        "porque aqui tem muita fiscalização e não temos privacidade.",
        "pra gente conversar em segredo sem ninguém monitorando.",
        "que lá eu consigo te mandar fotos e áudios privados.",
        "porque minha conta aqui vai expirar hoje à noite.",
        "assim falamos sem limites e sem bloqueio do sistema.",
        "porque o chat daqui apaga minhas mensagens importantes.",
        "para podermos resolver tudo sem o robô do aplicativo ler.",
        "que no WhatsApp é mais reservado e ninguém se mete.",
        "porque vou desinstalar esse app ainda hoje.",
    ]
    mig_fins = [
        "Anota meu número aí!", "Manda o seu número agora meu bem.",
        "Me chama lá urgente!", "Não deixa ninguém ver.", "É bem mais reservado.",
        "Te espero lá em 5 minutos.", "Apaga aqui depois que me adicionar.",
        "Só confio de conversar lá fora.", "Manda rapidinho por favor.",
        "Lá a gente combina tudo em sigilo.",
    ]
    for mc in mig_chamadas:
        for mm in mig_motivos:
            for mf in mig_fins:
                pool_migracao.add(f"{mc} {mm} {mf}")
                pool_migracao.add(f"Meu amor, {mc.lower()} {mm} {mf}")

    data.extend(sample_pool(pool_suspeitas, 2200, "MENSAGEM_SUSPEITA"))
    data.extend(sample_pool(pool_migracao, 1200, "MENSAGEM_SUSPEITA"))

    # =========================================================================
    # 4. SUBLIMACAO_MENSAGEM (3.400 frases — 2.200 vitimização/sigilo + 1.200 golpe do amor)
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
        "Fui despejada e estou com as malas na calçada sem saber onde vou dormir esta noite",
        "Estou devendo no mercado e tenho vergonha de sair na rua sem ter nem 100 reais",
        "A receita do meu remédio contínuo venceu e não tenho dinheiro para comprar outra caixa",
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
        "Não deixe ninguém pegar seu celular, apague o nosso chat por precaução",
        "Não conte para seus netos ou vizinhos sobre nós porque vão sentir inveja",
        "Mantenha tudo em segredo absoluto e nunca mostre seu celular para ninguém",
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
        ", reze por mim para que esse pesadelo acabe logo.",
        ", meu peito chega a apertar de tanta angústia.",
        ", fico sem chão quando olho as contas acumuladas.",
        ", não tenho mais forças para passar por isso sozinha.",
    ]

    for lam in lamentos_principais:
        for ext in extensoes_sublimadas:
            pool_sublimadas.add(f"{lam}{ext}")
            pool_sublimadas.add(f"É tão difícil: {lam.lower()}{ext}")
            pool_sublimadas.add(f"Infelizmente, {lam.lower()}{ext}")
            pool_sublimadas.add(f"Meu anjo, {lam.lower()}{ext}")

    for seg in segredos_apagar:
        for ext in extensoes_sublimadas:
            pool_sublimadas.add(f"{seg}{ext}")
            pool_sublimadas.add(f"Meu bem, preste atenção: {seg.lower()}{ext}")
            pool_sublimadas.add(f"Por segurança: {seg.lower()}{ext}")
            pool_sublimadas.add(f"Escute meu amor: {seg.lower()}{ext}")

    for l in lamentos_principais:
        for s in segredos_apagar:
            pool_sublimadas.add(f"{l}. {s}.")
            pool_sublimadas.add(f"{s}. {l}.")

    # Golpe do Amor (Romance Scam / Love Bombing + isolamento + bloqueio no exterior)
    pool_romance = set()
    perfis_amor = [
        "Sou médico em missão humanitária no exterior e senti que Deus nos uniu",
        "Sou engenheiro trabalhando em plataforma de petróleo fora do Brasil e me apaixonei por você",
        "Sou militar viúvo em missão internacional e você é o grande amor da minha vida",
        "Nunca amei ninguém tão rápido assim, somos almas gêmeas destinadas a ficar juntas",
        "Quero largar tudo no exterior para morar com você no Brasil e cuidar de você para sempre",
        "Sou cirurgião aposentado na Europa e sonho em casar com você ainda este ano",
        "Desde a primeira foto soube que Deus colocou você no meu caminho para sermos felizes",
        "Estou terminando meu contrato na plataforma marítima só para viver ao seu lado",
        "Você devolveu a alegria ao meu coração solitário, quero comprar uma casa para nós dois",
        "Meu amor por você é verdadeiro e eterno, não vejo a hora de desembarcar no Brasil",
    ]
    obstaculos_amor = [
        "mas minha conta bancária internacional foi bloqueada bem na hora de comprar a passagem para te ver.",
        "só que os seus filhos vão ter ciúmes do nosso amor, então não conte nada para sua família.",
        "porém estou sem acesso aos meus dólares na plataforma e preciso provar meu amor com sua ajuda.",
        "mas não fale com seus parentes sobre nossos planos porque eles não querem ver você feliz.",
        "só não posso fazer chamada de vídeo por regras de sigilo da missão militar, confie no meu coração.",
        "mas o banco estrangeiro reteve meu salário justamente na semana da minha viagem para o Brasil.",
        "só que preciso quitar uma taxa de saída do contrato no exterior antes de poder te abraçar.",
        "mas seus parentes só se preocupam com a sua herança e vão tentar separar a gente.",
        "porém a câmera do meu celular quebrou na missão, por isso nunca consigo atender vídeo.",
        "só falta resolver um bloqueio temporário na minha conta internacional para eu ir morar com você.",
    ]
    fechos_amor = [
        "Se você me ama de verdade vai confiar só em mim.",
        "Prometa que vai guardar nosso segredo de todos.",
        "Só falta esse obstáculo para eu correr para os seus braços.",
        "Apague nossas conversas depois para evitar fofoca da família.",
        "Ninguém precisa saber dos nossos planos até eu chegar aí.",
        "Confie no nosso amor acima da opinião dos seus filhos.",
        "Você é a única pessoa no mundo em quem posso confiar agora.",
        "Quando eu chegar no Brasil vou recompensar cada gesto de carinho seu.",
    ]
    for pa in perfis_amor:
        for oa in obstaculos_amor:
            for fa in fechos_amor:
                pool_romance.add(f"{pa}, {oa} {fa}")
                pool_romance.add(f"Meu amor, {pa.lower()}, {oa} {fa}")

    data.extend(sample_pool(pool_sublimadas, 2200, "SUBLIMACAO_MENSAGEM"))
    data.extend(sample_pool(pool_romance, 1200, "SUBLIMACAO_MENSAGEM"))

    # =========================================================================
    # 5. AMEACA_EXTORSAO (2.800 frases — falso delegado, sextorsão, bloqueio)
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
        "Aqui é o capitão da polícia responsável pela operação contra assédio digital.",
        "Aviso judicial urgente: processo de bloqueio de contas e penhora de aposentadoria.",
        "Sou o escrivão da Polícia Federal responsável pela intimação no seu endereço.",
        "Aqui é da facção do bairro, sabemos onde você mora e temos seus dados completos.",
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
        "O oficial de justiça já está a caminho do seu bairro com os mandados de busca e apreensão.",
        "Sua aposentadoria e seu CPF serão bloqueados hoje mesmo se não quitar essa pendência via Pix.",
        "Tenho vídeos e prints seus salvos e vou mandar para todos os seus contatos do WhatsApp.",
        "Vamos divulgar suas fotos montadas em todos os grupos da sua cidade se não pagar agora.",
        "O bloqueio judicial das suas contas bancárias e da sua casa será executado ainda hoje.",
    ]
    prazos_extorsao = [
        "Você tem exatamente 30 minutos para realizar a transferência antes do mandado ser cumprido.",
        "O prazo termina ao meio-dia, depois disso não tem mais conversa nem acordo extrajudicial.",
        "Faça o Pix agora mesmo nessa chave se quiser que o processo seja arquivado em sigilo absoluto.",
        "Pague os custos cartorários agora ou seus familiares receberão o dossiê completo hoje à tarde.",
        "Transfira o valor estipulado imediatamente para evitar escândalo e vergonha na sua vizinhança.",
        "Estou aguardando o comprovante de pagamento nos próximos 15 minutos sem desculpas.",
        "Pague a indenização prévia do dano moral agora ou assuma as consequências de uma prisão preventiva.",
        "Ou você resolve essa pendência financeira agora mesmo ou a cadeia é certa.",
        "Não tente desligar nem bloquear este número porque já temos seu endereço completo.",
        "Envie o comprovante do Pix em até 20 minutos para cancelar a operação policial.",
    ]

    for p in personagens_ameaca:
        for a in ameacas_acao:
            for pr in prazos_extorsao:
                pool_extorsoes.add(f"{p} {a} {pr}")
                pool_extorsoes.add(f"Urgente: {p} {a} {pr}")
                if len(pool_extorsoes) >= 4500:
                    break
            if len(pool_extorsoes) >= 4500:
                break
        if len(pool_extorsoes) >= 4500:
            break

    data.extend(sample_pool(pool_extorsoes, 2800, "AMEACA_EXTORSAO"))

    # =========================================================================
    # 6. EMERGENCIA_FINANCEIRA (3.000 frases — saúde, acidente, voz clonada/sequestro)
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
        "Meu pai idoso teve um pico de pressão e precisa ser internado às pressas na UTI",
        "Alô mãe, socorro! Sofri um acidente aqui na estrada e o pneu estourou",
        "Pai, pelo amor de Deus, fui sequestrado e estão comigo dentro do carro",
        "Vó, sou eu chorando aqui, bati o carro e levaram tudo no assalto",
        "Alô tia, estou no hospital após um atropelamento e ninguém da família atende",
        "Mãe, me prenderam aqui no cativeiro e estão apontando uma arma pra mim",
        "Socorro pai, o carro capotou na BR e estou machucado esperando socorro",
    ]
    pedidos_emerg = [
        "preciso pagar a caução de R$ 800 do hospital agora senão cancelam a internação",
        "o guincho está exigindo R$ 450 no Pix adiantado para tirar o carro da pista perigosa",
        "preciso de R$ 600 urgente para comprar a medicação controlada na farmácia de plantão",
        "não tenho como pagar a diária da clínica e estão ameaçando suspender os remédios",
        "estou na delegacia sem dinheiro da passagem e preciso de R$ 250 para conseguir voltar",
        "preciso de R$ 1.200 para a cirurgia de emergência antes das 18 horas para salvar o rim",
        "a ambulância particular está cobrando R$ 500 para fazer o translado imediato",
        "preciso pagar o anestesista no Pix agora para liberarem o centro cirúrgico",
        "preciso pagar o resgate via Pix agora e não liga pra polícia senão vai complicar",
        "faz um Pix urgente de R$ 900 pro guincho porque meu celular vai acabar a bateria",
        "o hospital particular só libera o oxigênio com depósito imediato de R$ 1.500 no Pix",
        "estão exigindo R$ 2.000 no Pix nessa chave para me soltarem agora sem me machucar",
        "preciso de R$ 700 no Pix para pagar o exame de urgência e os pontos",
        "manda R$ 550 no Pix para o mecânico da rodovia destravar o freio agora",
    ]
    apelos = [
        "por favor me ajude pelo amor de Deus!",
        "é uma questão de vida ou morte!",
        "estou em desespero total sem saber a quem recorrer!",
        "assim que resolver essa tragédia eu te devolvo tudo sem falta!",
        "me salva dessa situação terrível por favor, estou chorando de pânico!",
        "tenha piedade da minha família nessa hora tão difícil!",
        "não desliga e faz o Pix rápido agora!",
        "não conta pra polícia e manda o comprovante correndo!",
        "meu celular tá com 2% de bateria, faz o Pix já!",
        "só você pode salvar minha vida nesse momento!",
    ]

    for ac in acidentados:
        for pe in pedidos_emerg:
            for ap in apelos:
                pool_emergencias.add(f"{ac} e {pe}, {ap}")
                pool_emergencias.add(f"Socorro! {ac}, {pe}! {ap}")

    data.extend(sample_pool(pool_emergencias, 3000, "EMERGENCIA_FINANCEIRA"))

    # =========================================================================
    # 7. ENCOMENDA_TAXA (2.600 frases — 1.400 mala alfândega + 1.200 Correios/Receita)
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
        "uma mala com 100 mil euros que guardei durante anos de trabalho no exterior",
        "uma caixa lacrada com notebooks, joias e 30 mil dólares de presente",
        "um volume internacional com anel de diamante e documentos de viagem",
    ]
    problemas_alf = [
        "ficou retida na alfândega do aeroporto de Guarulhos",
        "a Receita Federal interceptou e exigiu o pagamento imediato de tributos aduaneiros",
        "o diplomata encarregado foi barrado pela polícia aduaneira em Curitiba",
        "a transportadora internacional DHL suspendeu a entrega por pendência fiscal",
        "a alfândega internacional reteve a carga exigindo o recolhimento da taxa aduaneira",
        "os agentes fiscais da aduana exigiram o pagamento da guia de importação",
        "o pacote foi confiscado temporariamente até a quitação da multa da Receita",
        "a carga ficou bloqueada no porto esperando liberação alfandegária urgente",
    ]
    solucoes_taxa = [
        "você precisa pagar a taxa de liberação de R$ 1.500 no Pix com urgência",
        "deposite a multa aduaneira de R$ 2.200 para o agente liberar a entrega na sua residência",
        "pague a guia fiscal de R$ 1.800 que a transportadora entrega a mala na sua porta hoje",
        "faça o Pix da taxa de desembaraço aduaneiro que eu te devolvo o triplo assim que desembarcar",
        "pague o valor da alfândega para eles não confiscarem todo o nosso patrimônio enviado",
        "pague a tarifa de liberação consular de R$ 2.500 para liberarem a entrega em domicílio",
        "transfira R$ 1.350 via Pix da taxa de scanner e inspeção aduaneira ainda hoje",
        "envie o Pix da taxa alfandegária de R$ 1.900 para o agente despachar o pacote",
    ]

    for it in itens_luxo:
        for pr in problemas_alf:
            for sol in solucoes_taxa:
                pool_encomendas.add(f"Enviei {it} para você, mas {pr}, {sol}.")
                pool_encomendas.add(f"Atenção meu bem: {it} {pr}. Por favor, {sol}.")
                pool_encomendas.add(f"Meu amor, mandei {it} com carinho, só que {pr}. Você consegue {sol.lower()}?")

    pool_correios = set()
    correios_prefix = [
        "CORREIOS AVISO:", "Receita Federal informa:", "Rastreamento de Encomenda:",
        "Aviso de Entrega Urgente:", "Alfândega de Curitiba:",
        "Central de Distribuição Postal:", "Notificação Aduaneira:", "Transportadora informa:",
        "Correios Brasil:", "Fiscalização da Receita:", "Entrega Retida:",
        "Despacho Aduaneiro:", "Atenção Destinatário:",
    ]
    correios_corpo = [
        "Seu objeto postal foi taxado na alfândega e aguarda pagamento do despacho postal",
        "Sua encomenda internacional ficou retida por pendência de imposto aduaneiro",
        "Seu pedido online está bloqueado no centro de distribuição aguardando taxa de liberação",
        "Identificamos tributação pendente no seu pacote dos Correios com prazo final hoje",
        "Sua compra importada foi retida pela fiscalização aduaneira e será devolvida em 24h",
        "O pacote endereçado ao seu CPF sofreu bloqueio fiscal na unidade de Curitiba",
        "Sua entrega foi suspensa por divergência tributária e exige quitação imediata",
        "Consta pendência de tarifa de importação no seu pedido comprado pela internet",
        "Seu objeto internacional será leiloado ou devolvido caso a guia não seja paga hoje",
        "Aviso final: sua encomenda dos Correios aguarda pagamento do imposto de liberação",
    ]
    correios_acao = [
        "pague a guia de R$ 68,90 via Pix agora para liberar a entrega no seu endereço.",
        "regularize a taxa alfandegária de R$ 97,50 hoje para evitar a perda do objeto.",
        "efetue o pagamento da tarifa de desembaraço postal em até 24 horas.",
        "quite a taxa de liberação da Receita via Pix para receber seu pacote amanhã.",
        "faça o Pix de R$ 54,80 da taxa de despacho postal para atualizar o rastreio.",
        "transfira R$ 119,90 do imposto aduaneiro agora para o carteiro sair para entrega.",
        "pague o boleto/Pix da taxa de importação hoje antes do cancelamento do envio.",
        "libere seu pacote pagando a tarifa fiscal de R$ 79,40 nesta chave Pix.",
        "confirme o pagamento da taxa de armazenagem dos Correios de R$ 49,90 agora.",
        "envie o Pix da guia aduaneira ainda hoje para evitar multa no seu CPF.",
    ]
    for cp in correios_prefix:
        for cc in correios_corpo:
            for ca in correios_acao:
                pool_correios.add(f"{cp} {cc}, {ca}")
                pool_correios.add(f"{cc}; {ca}")

    data.extend(sample_pool(pool_encomendas, 1400, "ENCOMENDA_TAXA"))
    data.extend(sample_pool(pool_correios, 1200, "ENCOMENDA_TAXA"))

    # =========================================================================
    # 8. INVESTIMENTO_SUSPEITO (3.600 frases — 1.800 cripto/forex + 1.800 tarefas/urubu)
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
        "Comecei a ter uma renda passiva fantástica ao",
    ]
    ativos_inv = [
        "investir em criptomoedas na corretora Binance clonada",
        "comprar Tether USDT na plataforma internacional de arbitragem",
        "operar no mercado de Forex com robô automatizado de alta precisão",
        "comprar Bitcoin com sinal privilegiado da corretora estrangeira",
        "investir em derivativos de ouro digital com rendimento diário",
        "aplicar em contratos futuros de criptoativos com inteligência artificial",
        "fazer operações de swap de moedas com garantia de liquidez diária",
        "operar fundos de liquidez sintética em exchanges descentralizadas",
        "aplicar na plataforma VIP de mineração de criptomoedas em nuvem",
        "investir em opções binárias com sala de sinais garantidos",
    ]
    promessas_inv = [
        "rendendo 5% ao dia garantido sem nenhum risco de perda.",
        "com retorno imediato e você pode sacar os lucros na mesma hora.",
        "lucro certo de 100% em menos de duas semanas de aplicação.",
        "rendimento mensal garantido muito superior à poupança e ao CDB.",
        "uma renda passiva de R$ 500 por dia com investimento inicial mínimo.",
        "onde você coloca R$ 300 hoje e resgata R$ 1.500 no final da semana.",
        "sem nenhuma burocracia e com rentabilidade fixa comprovada em contrato.",
        "podendo sacar seus rendimentos em reais direto na conta todo dia.",
        "com juros compostos de 10% ao dia pagos direto na sua chave Pix.",
        "dobrando seu dinheiro em 48 horas com risco zero comprovado.",
    ]

    for ii in introducoes_inv:
        for at in ativos_inv:
            for pi in promessas_inv:
                pool_investimentos.add(f"{ii} {at}, {pi}")
                pool_investimentos.add(f"Não perca essa chance meu bem: {ii.lower()} {at} {pi}")
                pool_investimentos.add(f"Oportunidade única: {ii.lower()} {at}. {pi}")

    pool_tarefas = set()
    empresas_tar = [
        "Shopee", "Mercado Livre", "Amazon", "TikTok", "YouTube",
        "Shein", "Google Maps", "Instagram", "Kwai", "agência de marketing digital",
    ]
    acoes_tar = [
        "curtindo vídeos curtos e seguindo perfis",
        "avaliando hotéis e lojas com 5 estrelas",
        "adicionando produtos no carrinho virtual",
        "cumprindo missões simples pelo celular em home office",
        "fazendo tarefas diárias de avaliação de marcas",
        "assistindo vídeos promocionais por 30 segundos",
        "deixando comentários positivos em anúncios de parceiros",
        "clicando em ofertas patrocinadas pelo aplicativo",
    ]
    ganhos_tar = [
        "ganhe de R$ 150 a R$ 500 por dia via Pix imediato.",
        "receba comissões diárias de R$ 300 trabalhando só 30 minutos.",
        "faça um depósito de recarga via Pix para desbloquear as tarefas VIP com lucro em dobro.",
        "deposite R$ 200 na plataforma para liberar o saque da sua comissão acumulada.",
        "invista R$ 100 na tarefa pré-paga e receba R$ 350 de volta na mesma hora.",
        "recarga mínima de R$ 150 no Pix para subir de nível VIP e multiplicar seu saldo.",
        "pague o aporte da missão comercial de R$ 300 e saque R$ 900 hoje mesmo.",
        "saldos acumulados no painel só liberam após completar a tarefa de depósito via Pix.",
        "comece ganhando R$ 20 no primeiro Pix e faça recarga para ganhar R$ 800 por dia.",
        "sem experiência necessária, basta recarregar R$ 120 na plataforma VIP para sacar.",
    ]
    for emp in empresas_tar:
        for ac in acoes_tar:
            for gn in ganhos_tar:
                pool_tarefas.add(f"Olá! Somos da equipe de recrutamento da {emp}: trabalhe {ac} e {gn}")
                pool_tarefas.add(f"Renda extra {emp}: ganhe dinheiro {ac}; {gn}")
                pool_tarefas.add(f"Tarefa remunerada {emp} — {ac}, {gn}")

    urubu_ab = [
        "Tabela do Pix multiplicador ativa hoje:",
        "Urubu do Pix liberado agora:",
        "Plataforma de multiplicação de Pix garantida:",
        "Robô de banca de apostas com lucro certo:",
        "Esquema de retorno instantâneo no Pix:",
        "Promoção relâmpago de retorno garantido:",
    ]
    urubu_val = [
        "envie R$ 50 e receba R$ 500", "mande R$ 100 e receba R$ 1.000",
        "invista R$ 150 e volte R$ 1.500", "coloque R$ 200 e saque R$ 2.000",
        "aplique R$ 300 e ganhe R$ 2.400", "transfira R$ 250 e receba R$ 1.800",
    ]
    urubu_fim = [
        "em 5 minutos direto na sua conta!", "sem risco de perda e comprovado!",
        "na hora via Pix automático!", "hoje mesmo antes de fechar o grupo VIP!",
        "com 100% de garantia de pagamento!", "para os 10 primeiros que fizerem o Pix!",
    ]
    for ua in urubu_ab:
        for uv in urubu_val:
            for uf in urubu_fim:
                pool_tarefas.add(f"{ua} {uv} {uf}")

    data.extend(sample_pool(pool_investimentos, 1800, "INVESTIMENTO_SUSPEITO"))
    data.extend(sample_pool(pool_tarefas, 1800, "INVESTIMENTO_SUSPEITO"))

    # =========================================================================
    # 9. LINK_MALICIOSO (3.600 frases — 1.600 phishing + 2.000 INSS/AnyDesk/lojas)
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
        "Confira o álbum exclusivo clicando no endereço abaixo:",
        "Toque no link oficial abaixo para desbloquear sua conta:",
        "Instale o arquivo de atualização clicando aqui:",
    ]
    urls_suspeitas = [
        "bit.ly/fotos-privadas-2026", "t.me/chat-vip-oficial", "cartorio-digital-online.com/validar-doc",
        "meu-banco-seguro-app.net/login", "atualizacao-conta-bradesco.online", "aplicativo-conversa-segura.apk",
        "fotos-familia-album.com/download.apk", "tinyurl.com/acesso-restrito-beneficio", "is.gd/chat-secreto-privado",
        "painel-seguranca-beneficiario.cc", "recadastramento-inss-urgente.org", "valida-documento-tabeliao.info",
        "meuinss-provadevida-gov.online", "suporte-banco-seguro.app/instalar.apk", "promocao-queima-estoque.shop/pix",
        "caixa-atualizacao-segura.net/acesso", "bb-modulo-protecao.online/baixar.apk", "t.co/confirmacao-urgente-conta",
    ]
    urgencias_link = [
        "é rápido e seguro!", "não demora nem um minuto.", "senão vai expirar em poucas horas.",
        "para liberar nossa conversa privativa.", "preciso que você confirme logo.",
        "antes que o link seja desativado pelo sistema.", "para eu conseguir te ligar com vídeo hoje.",
        "é só clicar e baixar no seu aparelho.", "assim você já vê tudo na tela.", "para validar com sucesso.",
    ]

    for cl in chamadas_link:
        for us in urls_suspeitas:
            for ul in urgencias_link:
                pool_links.add(f"{cl} https://{us} {ul}")
                pool_links.add(f"{cl} http://{us}, {ul}")

    pool_links_novos = set()

    # 9A. INSS / Gov.br Prova de Vida / Biometria / 14º salário
    inss_avisos = [
        "INSS AVISO: Identificamos pendência na sua Prova de Vida anual. Seu benefício será BLOQUEADO em 24 horas.",
        "Prezado segurado, sua aposentadoria requer recadastramento biométrico obrigatório para evitar suspensão.",
        "MEU INSS: Atualize seus dados cadastrais e biometria facial hoje para não perder o pagamento do mês.",
        "AVISO GOV.BR: Seu benefício previdenciário está suspenso por falta de validação cadastral.",
        "INSS LIBEROU o 14º salário e valores esquecidos para aposentados e pensionistas, consulte já.",
        "Atenção aposentado: prazo final hoje para confirmar sua Prova de Vida digital sem bloqueio.",
        "Previdência Social: seu CPF apresenta pendência no cadastro biométrico do benefício.",
        "MEU INSS ALERTA: confirme seus dados bancários e gov.br para liberar a revisão salarial.",
        "Comunicado INSS: evite o cancelamento imediato da sua pensão atualizando seu cadastro agora.",
        "Valores a receber do INSS liberados para saque imediato no seu CPF hoje.",
    ]
    inss_links = [
        "Regularize imediatamente clicando no link: https://recadastramento-inss-urgente.org",
        "Evite o bloqueio acessando: https://meuinss-provadevida-gov.online",
        "Faça a confirmação agora em: https://tinyurl.com/acesso-restrito-beneficio",
        "Clique aqui e informe seus dados do gov.br: https://painel-seguranca-beneficiario.cc",
        "Acesse o portal de regularização: https://bit.ly/prova-vida-inss-agora",
        "Valide seu benefício em 1 minuto aqui: https://meu-inss-atualizacao.online/govbr",
        "Consulte e saque pelo endereço: https://valores-inss-saque.info/consultar",
        "Baixe o aplicativo atualizado do INSS aqui: https://inss-biometria-app.net/meuinss.apk",
    ]
    inss_prazos = [
        "Prazo final hoje às 18h.", "Não deixe para depois.", "Evite a suspensão do seu pagamento.",
        "Acesso válido apenas por 24 horas.", "Atendimento gratuito online.", "Confirme já.",
    ]
    for ia in inss_avisos:
        for il in inss_links:
            for ip in inss_prazos:
                pool_links_novos.add(f"{ia} {il} {ip}")

    # 9B. Acesso Remoto (AnyDesk, TeamViewer, RustDesk, APK de suporte)
    remoto_apps = [
        "AnyDesk", "TeamViewer", "RustDesk", "AirDroid",
        "o aplicativo de suporte remoto", "o módulo de segurança .apk",
        "o app de acesso remoto do banco", "o suporte técnico remoto QuickSupport",
    ]
    remoto_motivos = [
        "para eu cancelar essa compra suspeita no seu cartão agora mesmo",
        "para configurar o recebimento do seu precatório na audiência virtual",
        "para remover o vírus que invadiu o aplicativo do seu banco",
        "para fazer a atualização obrigatória de segurança da sua conta bancária",
        "para liberar a devolução do empréstimo consignado feito por engano",
        "para eu ajudar a senhora a desbloquear o limite do Pix na tela",
        "para sincronizar o token antifraude no seu celular com a central",
        "para concluir a prova de vida remota do seu benefício",
        "para estornar a transferência não autorizada em tempo real",
        "para validar o alvará judicial no aplicativo do seu banco",
    ]
    remoto_fins = [
        "Baixe agora na loja do celular e me avise quando abrir.",
        "Instale pelo link https://suporte-banco-seguro.app/instalar.apk agora.",
        "É o procedimento padrão da central de segurança, não desligue.",
        "Clique para instalar o arquivo e libere todas as permissões na tela.",
        "Assim que instalar clique em aceitar acesso para eu resolver tudo.",
        "Pode baixar tranquilo na Play Store que eu te guio passo a passo.",
        "Ative o compartilhamento de tela assim que abrir o programa.",
        "Instale rapidinho antes que o invasor faça outra transferência.",
    ]
    for ra in remoto_apps:
        for rm in remoto_motivos:
            for rf in remoto_fins:
                pool_links_novos.add(f"Baixe o {ra} no seu celular {rm}. {rf}")
                pool_links_novos.add(f"Por favor instale {ra} agora {rm}; {rf}")

    # 9C. Lojas falsas / promoções relâmpago (jovens e adultos)
    lojas_produtos = [
        "iPhone 15 Pro por R$ 499", "Smart TV 55 polegadas por R$ 299",
        "AirFryer e geladeira com 90% de desconto", "notebook novo em queima de estoque por R$ 350",
        "smartphone lacrado em promoção relâmpago por R$ 199", "fogão e micro-ondas juntos por R$ 249",
        "tênis importado original por R$ 69", "ar-condicionado inverter novo por R$ 399",
        "PlayStation 5 lacrado por R$ 599", "kit panelas e liquidificador por R$ 89",
    ]
    lojas_desc = [
        "queima de estoque da Receita Federal", "liquidação de fechamento de loja",
        "oferta secreta de aniversário", "desconto de 85% pagando no Pix",
        "lote promocional com frete grátis", "últimas unidades direto da fábrica",
    ]
    lojas_ctas = [
        "Garanta clicando no link: https://promocao-queima-estoque.shop/pix",
        "Acesse a oferta exclusiva agora: https://bit.ly/oferta-relampago-pix",
        "Clique aqui para comprar com desconto: https://tinyurl.com/loja-queima-total",
        "Compre já antes que acabe: https://outlet-desconto-oficial.online/oferta",
        "Finalize no Pix pelo site: https://megaliquidacao-brasil.cc/comprar",
        "Confira o estoque limitado aqui: https://is.gd/promocao-imperdivel-hoje",
    ]
    for lp in lojas_produtos:
        for ld in lojas_desc:
            for lc in lojas_ctas:
                pool_links_novos.add(f"PROMOÇÃO IMPERDÍVEL ({ld}): {lp}! {lc}")

    data.extend(sample_pool(pool_links, 1600, "LINK_MALICIOSO"))
    data.extend(sample_pool(pool_links_novos, 2000, "LINK_MALICIOSO"))

    # =========================================================================
    # 10. FALSA_DOACAO_HERANCA (2.600 frases — 1.300 herança + 1.300 falso advogado/precatório)
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
        "Fui abençoado financeiramente na vida e decidi fazer uma caridade substancial",
        "Sou empresário doente na Europa e escolhi você para herdar minha conta",
        "Trabalho na diretoria de um banco internacional com fundos sem herdeiros",
    ]
    valores_doa = [
        "e decidi doar 500 mil dólares para você administrar",
        "e escolhi você para receber uma herança de 1 milhão de euros",
        "e quero transferir 800 mil dólares para sua conta bancária no Brasil",
        "para destinar fundos de caridade de R$ 2.500.000 para obras sociais sob seus cuidados",
        "e reservei 300 mil libras esterlinas para colocar no seu nome",
        "e elegi seu perfil para receber todo o saldo remanescente das contas bancárias",
        "e separei 650 mil dólares em testamento registrado no seu nome",
        "e liberei uma doação internacional de 400 mil euros para sua família",
    ]
    condicoes_doa = [
        "mas você precisa pagar a taxa de transferência cartorária de R$ 850 antecipada.",
        "envie apenas o valor de R$ 1.200 dos impostos consulares para liberação da remessa.",
        "basta depositar as custas judiciais internacionais de R$ 950 para receber o alvará.",
        "pague a taxa do tabelião em Londres no valor de R$ 1.500 para liberar o depósito no seu banco.",
        "você só precisa arcar com a tarifa de registro diplomático de R$ 1.100 para receber a doação.",
        "faça o Pix da guia de homologação da herança para que o banco britânico libere os fundos.",
        "transfira R$ 780 referentes à tradução juramentada dos documentos do testamento.",
        "quite a taxa cambial de R$ 1.350 via Pix para o dinheiro cair ainda hoje na sua conta.",
    ]

    for od in origens_doa:
        for vd in valores_doa:
            for cd in condicoes_doa:
                pool_doacoes.add(f"{od} {vd}, {cd}")
                pool_doacoes.add(f"Mensagem de fé: {od.lower()} {vd}, {cd}")
                pool_doacoes.add(f"Com a bênção de Deus: {od.lower()} {vd}. Por favor, {cd}")

    # Golpe do Falso Advogado / Falso Precatório / RPV / Alvará Judicial
    pool_precatorio = set()
    adv_aberturas = [
        "Bom dia, aqui é o Dr. Ricardo do escritório de advocacia que cuida da sua ação",
        "Olá, somos do setor jurídico do tribunal informando sobre o seu processo ganho",
        "Boa notícia! Seu precatório e sua RPV acabaram de ser liberados pelo juiz",
        "Aqui é do escritório do seu advogado: sua ação de revisão do INSS saiu hoje",
        "Notificação do STJ: sua indenização retroativa e alvará judicial estão prontos para saque",
        "Dr. Marcelo advogado aqui, o processo trabalhista foi julgado procedente com liberação imediata",
        "Dra. Patrícia do jurídico informa: seu processo de atrasados do INSS foi aprovado",
        "Escritório de advocacia avisa: o juiz assinou hoje a liberação do seu precatório federal",
        "Parabéns! Saiu a sentença favorável da sua ação judicial com depósito imediato",
        "Aviso do departamento de precatórios: seu alvará de levantamento já está expedido",
    ]
    adv_valores = [
        "no valor de R$ 48.500", "no montante de R$ 72.000", "somando R$ 35.800 com correção",
        "no total de R$ 95.000 já depositados em conta judicial", "no valor líquido de R$ 63.000",
        "totalizando R$ 54.200 livres de imposto", "no valor de R$ 118.000 de atrasados",
        "com crédito aprovado de R$ 29.900", "no montante atualizado de R$ 84.500",
        "no valor de R$ 41.000 pronto para transferência",
    ]
    adv_taxas = [
        "mas para o juiz liberar o alvará hoje você precisa pagar as custas processuais de R$ 980 via Pix.",
        "envie o Pix da guia de recolhimento do cartório de R$ 1.250 até as 17h para receber o valor hoje.",
        "faça a transferência dos honorários antecipados e imposto de liberação para desbloquear o precatório.",
        "pague a taxa de certidão do tribunal de R$ 750 nessa chave Pix que o dinheiro cai em 20 minutos.",
        "precisa quitar a guia fiscal da Justiça no Pix agora senão o alvará volta para o final da fila.",
        "basta pagar a taxa de autenticação do contador judicial de R$ 890 no Pix para liberar o saque.",
        "transfira R$ 1.100 de custas cartorárias antecipadas para concluir o levantamento da RPV hoje.",
        "faça o pagamento da guia DARF judicial de R$ 650 nesta chave Pix antes do encerramento do expediente.",
        "pague os emolumentos do tribunal de R$ 1.400 via Pix para o banco creditar o valor na hora.",
        "envie R$ 820 no Pix referentes à taxa de desbloqueio do alvará eletrônico.",
    ]
    for aa in adv_aberturas:
        for av in adv_valores:
            for at in adv_taxas:
                pool_precatorio.add(f"{aa} {av}, {at}")
                pool_precatorio.add(f"Urgente processo judicial: {aa.lower()} {av}; {at}")

    data.extend(sample_pool(pool_doacoes, 1300, "FALSA_DOACAO_HERANCA"))
    data.extend(sample_pool(pool_precatorio, 1300, "FALSA_DOACAO_HERANCA"))

    # =========================================================================
    # 11. PEDIDO_CREDENCIAL (3.600 frases — 1.500 clássico + 2.100 Falsa Central/Gov/Motoboy/AnyDesk)
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
        "Me passa o código de autenticação de dois fatores que você recebeu por mensagem",
        "Me envia uma foto do seu cartão de débito e a data de validade",
        "Informe o pin de confirmação do WhatsApp que acabou de chegar por SMS",
    ]
    motivos_cred = [
        "para eu conseguir validar a nossa chamada de vídeo pelo sistema.",
        "para liberar o cadastro do aplicativo de chamadas gratuitas.",
        "para eu confirmar o pagamento da reserva da nossa viagem na maquininha.",
        "porque o sistema de segurança do banco bloqueou e pediu confirmação.",
        "para eu agendar a sua passagem aérea e reservar a van.",
        "para validar sua assinatura no cartório digital de forma segura.",
        "para comprovar que a sua linha telefônica está ativa e habilitada.",
        "para que eu consiga desativar o bloqueio de segurança do servidor.",
        "para atualizar seu acesso e evitar suspensão da conta.",
        "para concluir o agendamento do brinde promocional hoje.",
    ]
    garantias_cred = [
        "pode confiar em mim meu bem, é 100% seguro.",
        "é rapidinho, faz agora por favor antes que expire.",
        "preciso disso urgente antes que o código perca a validade de 5 minutos.",
        "não tem perigo nenhum meu anjo, sou eu quem estou pedindo.",
        "assim que eu digitar aqui o sistema libera a nossa ligação.",
        "faça isso agora mesmo para a gente não perder a viagem agendada.",
        "é só um protocolo automático de verificação.",
        "manda logo antes que o prazo termine.",
    ]

    for pc in pedidos_cred:
        for mc in motivos_cred:
            for gc in garantias_cred:
                pool_credenciais.add(f"{pc} {mc} {gc}")
                pool_credenciais.add(f"Por favor: {pc.lower()}, {mc} {gc}")

    pool_cred_novos = set()

    # 11A. Falsa Central de Banco
    falsa_central_ab = [
        "Olá, aqui é da central de segurança antifraude do seu banco",
        "Notamos uma tentativa de compra suspeita de R$ 2.500 no seu cartão em outro estado",
        "Identificamos uma invasão na sua conta bancária neste exato momento",
        "Central do Banco informa: seu cartão foi clonado e houve tentativa de saque agora",
        "Setor de prevenção a fraudes do banco ligando para bloquear um Pix suspeito",
        "Alerta da central do cartão: compra online de R$ 3.800 aguardando cancelamento",
        "Atendimento emergencial bancário: detectamos acesso não autorizado no seu aplicativo",
        "Departamento de segurança do banco detectou clonagem do seu cartão de crédito",
    ]
    falsa_central_ped = [
        "para cancelar a operação confirme sua senha de acesso e informe o token de segurança",
        "digite sua senha do cartão no teclado agora para bloquear a compra fraudulenta",
        "passe o código de 6 dígitos que acabou de chegar no seu SMS para efetuar o estorno",
        "informe o número completo do cartão, validade e código de segurança CVV para bloqueio imediato",
        "me diga os 9 números do AnyDesk que apareceram na tela para eu cancelar a invasão",
        "confirme sua senha eletrônica de 8 dígitos para ativarmos o bloqueio antifraude",
        "envie a senha de transação do aplicativo bancário para estornarmos a compra",
        "leia em voz alta ou digite o código de validação enviado para o seu celular",
    ]
    falsa_central_urg = [
        "antes que a compra seja faturada.", "imediatamente para não perder seu saldo.",
        "em até 2 minutos para validar o cancelamento.", "pois o fraudador ainda está conectado.",
        "sem desligar o atendimento.", "para proteger sua conta agora.",
    ]
    for fca in falsa_central_ab:
        for fcp in falsa_central_ped:
            for fcu in falsa_central_urg:
                pool_cred_novos.add(f"{fca}. {fcp.capitalize()} {fcu}")
                pool_cred_novos.add(f"Atenção cliente: {fca.lower()}; {fcp} {fcu}")

    # 11B. Gov.br / INSS / Consignado
    gov_ab = [
        "Para concluirmos sua Prova de Vida do INSS e evitar o bloqueio do benefício",
        "Para liberar sua margem de empréstimo consignado com juros reduzidos",
        "Para cancelar o desconto indevido no seu benefício do INSS agora mesmo",
        "Para atualizar o seu recadastramento biométrico obrigatório no portal Meu INSS",
        "Para consultar a devolução de descontos associativos do seu benefício",
        "Para aprovar a portabilidade do seu empréstimo consignado sem burocracia",
        "Para reativar sua conta gov.br que está com pendência cadastral",
        "Para liberar o cartão benefício consignado do INSS com taxa zero",
    ]
    gov_ped = [
        "informe seu CPF e sua senha de acesso do gov.br aqui pelo chat",
        "mande uma selfie bem nítida segurando seu RG e o número do seu benefício",
        "envie foto do RG, CPF, comprovante de residência e a senha do aplicativo Meu INSS",
        "passe o código de verificação do gov.br que chegou por SMS no seu celular",
        "digite a senha da sua conta gov.br e o número da sua conta bancária",
        "tire uma foto do seu rosto e da frente e verso do seu documento agora",
        "informe o código de 6 dígitos do Meu INSS que acabou de chegar",
        "mande foto do contracheque do INSS, RG e sua senha de acesso",
    ]
    gov_urg = [
        "para não suspender sua aposentadoria.", "antes do fim do prazo de hoje.",
        "para concluirmos a liberação imediata.", "e evitar descontos no próximo mês.",
        "que o processo é 100% gratuito.", "agora mesmo por favor.",
    ]
    for ga in gov_ab:
        for gp in gov_ped:
            for gu in gov_urg:
                pool_cred_novos.add(f"{ga}, {gp} {gu}")
                pool_cred_novos.add(f"Urgente INSS/Gov.br: {ga.lower()}, {gp} {gu}")

    # 11C. Golpe do Motoboy
    motoboy_ab = [
        "Seu cartão foi clonado e já fizemos o cancelamento preventivo pelo sistema",
        "Para concluir o bloqueio do cartão fraudado e emitir um cartão novo sem custos",
        "O banco enviou um portador credenciado para fazer a perícia no seu cartão clonado",
        "A central de segurança precisa recolher seu cartão bloqueado para evitar novas compras",
        "Para encerrar a fraude na sua conta e liberar o cartão substituto ainda hoje",
        "O setor de auditoria do banco agendou a retirada do seu cartão comprometido",
    ]
    motoboy_ped = [
        "corte o cartão ao meio sem danificar o chip, escreva a senha num papel e entregue ao motoboy do banco",
        "coloque o cartão e a carta com sua senha num envelope que o motoboy já está passando na sua casa",
        "entregue seu cartão e a senha anotada ao motoboy uniformizado que o banco mandou na sua residência",
        "anote sua senha de 4 dígitos no verso da carta de cancelamento e entregue junto com o cartão ao portador",
        "deixe o cartão com o chip intacto e a senha em um envelope lacrado para o motoboy recolher agora",
        "passe o cartão e a senha escrita à mão para o mensageiro autorizado do banco na sua portaria",
    ]
    motoboy_urg = [
        "ele chega em 15 minutos.", "para concluirmos o estorno da compra.",
        "esse procedimento é obrigatório para o seguro cobrir.", "não precisa ir até a agência.",
        "ele levará o protocolo assinado.", "fique atento à campainha.",
    ]
    for ma in motoboy_ab:
        for mp in motoboy_ped:
            for mu in motoboy_urg:
                pool_cred_novos.add(f"{ma}. {mp.capitalize()}, {mu}")

    # 11D. Frases curtas / código AnyDesk / TeamViewer / SMS
    short_cred_ab = [
        "Me passa", "Digita aqui", "Manda rapidinho", "Qual é",
        "Informa agora", "Me envia", "Preciso que me passe", "Me diz",
    ]
    short_cred_obj = [
        "o código de 6 dígitos que chegou no SMS", "os 9 números que apareceram no AnyDesk",
        "o ID e a senha do TeamViewer", "sua senha do gov.br",
        "o código de verificação do WhatsApp", "o CVV atrás do seu cartão de crédito",
        "sua senha de 4 dígitos do banco", "o token que apareceu no aplicativo do banco",
        "foto da frente e verso do seu cartão", "uma selfie segurando seu RG e CPF",
    ]
    short_cred_fim = [
        "agora por favor", "urgente antes que expire", "para eu cancelar a compra",
        "para validar seu benefício do INSS", "para liberar o acesso remoto",
        "para eu resolver seu problema no banco", "rapidinho pra confirmar aqui",
        "pra eu finalizar o estorno agora",
    ]
    for sca in short_cred_ab:
        for sco in short_cred_obj:
            for scf in short_cred_fim:
                pool_cred_novos.add(f"{sca} {sco} {scf}.")

    data.extend(sample_pool(pool_credenciais, 1500, "PEDIDO_CREDENCIAL"))
    data.extend(sample_pool(pool_cred_novos, 2100, "PEDIDO_CREDENCIAL"))

    # =========================================================================
    # 12. SONDAGEM_FINANCEIRA (2.200 frases — renda, banco, consignado, precatório)
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
        "Qual banco você tem conta aberta e movimenta seus recebimentos principais?",
        "Você já usou a sua margem de empréstimo consignado do INSS esse ano?",
        "Você tem algum processo na justiça ou precatório para receber em breve?",
        "Por qual banco cai o seu benefício da aposentadoria todo mês?",
        "Você mora sozinho aí na sua casa ou algum filho controla seu banco?",
        "Quanto você ganha de aposentadoria e qual o valor do seu limite do cheque especial?",
        "Você tem algum terreno, apartamento alugado ou reserva de emergência no banco?",
        "Qual o limite máximo de Pix diário que está liberado no seu aplicativo bancário?",
        "Você costuma sacar seu benefício ou deixa tudo rendendo na conta corrente?",
    ]
    pretextos_son = [
        "estou perguntando para a gente planejar o nosso futuro morando juntos.",
        "é só para eu saber do seu padrão de vida e se combina com o meu.",
        "assim a gente já planeja a compra de uma chácara para nós dois.",
        "para quando eu me mudar em definitivo para o Brasil e viver ao seu lado.",
        "só por curiosidade para eu conhecer melhor a sua rotina financeira.",
        "porque quero te ajudar a administrar melhor os seus recursos.",
        "para saber se podemos viajar para o exterior nas férias de fim de ano.",
        "porque em um relacionamento sincero não devemos esconder nada sobre bens.",
        "para ver se você tem direito a um benefício extra liberado no banco.",
        "para saber se vale a pena te indicar um investimento com ótimo rendimento.",
        "só para entender se você tem autonomia total sobre seu dinheiro.",
        "porque gosto de pessoas independentes e organizadas financeiramente.",
    ]
    complementos_son = [
        "Fique tranquila para me responder.",
        "Pode falar abertamente comigo meu amor.",
        "É importante sabermos disso desde já.",
        "Depois eu te conto tudo sobre os meus bens também.",
        "Quero cuidar bem de você quando estivermos juntos.",
        "Confiança mútua é a base de tudo entre nós.",
        "Pode me falar o valor aproximado sem vergonha.",
        "Guardo total discrição sobre o que conversamos.",
    ]

    for ps in perguntas_son:
        for prs in pretextos_son:
            for cs in complementos_son:
                pool_sondagens.add(f"{ps} {prs.capitalize()} {cs}")
                pool_sondagens.add(f"Meu bem, {ps.lower()} {prs.capitalize()} {cs}")

    data.extend(sample_pool(pool_sondagens, 2200, "SONDAGEM_FINANCEIRA"))

    # =========================================================================
    # 13. FALSO_INTERMEDIARIO (4.000 frases — 1.800 mecânico/terceiro + 2.200 falso parente)
    # =========================================================================
    pool_intermediarios = set()
    parentes_inter = [
        "do seu filho Marcos", "do seu neto Pedro", "da sua filha Juliana",
        "do seu sobrinho Lucas", "da sua neta Beatriz", "do seu genro Carlos",
        "do seu afilhado Gabriel", "da sua sobrinha Fernanda",
        "do seu filho Rafael", "da sua filha Amanda",
    ]
    profissoes_inter = [
        "Sou o mecânico que está atendendo o carro quebrado",
        "Sou o policial rodoviário que está prestando os primeiros socorros",
        "Sou o amigo da faculdade que está viajando junto",
        "Sou o motorista do guincho que rebocou o veículo na pista",
        "Sou o atendente da recepção do hospital que recebeu",
        "Sou o borracheiro do posto de gasolina onde parou",
        "Sou o colega de trabalho que socorreu na rua",
        "Sou o taxista que está trazendo para casa sem carteira",
        "Sou o gerente da oficina onde o carro deu pane",
    ]
    situacoes_inter = [
        "ele ficou sem bateria no telefone no meio da estrada e precisa de R$ 350 no Pix para o conserto urgente.",
        "ele perdeu a carteira com todos os cartões e pediu para a senhora fazer um Pix de R$ 400 para comprar a passagem de volta.",
        "ele sofreu um imprevisto na viagem e pediu para transferir R$ 500 para essa chave agora para liberar o combustível.",
        "o cartão dele foi bloqueado no posto e ele precisa de R$ 280 no Pix para pagar as despesas e voltar para casa.",
        "o pneu furou e rasgou na rodovia e ele precisa de R$ 320 para pagar o borracheiro que está no local.",
        "ele teve a bolsa furtada no terminal rodoviário e pediu para a senhora socorrer com R$ 450 no Pix dessa chave.",
        "o celular caiu e quebrou a tela e pediu para o senhor transferir R$ 600 no Pix para liberar o guincho.",
        "o aplicativo do banco travou aqui na oficina e pediu para pagar R$ 750 via Pix nessa chave.",
    ]
    urgencias_inter = [
        "Por favor dona Maria, faça o Pix agora nessa chave para ele não ficar desamparado na escuridão.",
        "Ele está desesperado aqui do meu lado sem sinal de operadora pedindo a sua ajuda urgente.",
        "Assim que ele chegar em casa ele devolve o dinheiro e liga para a senhora com calma.",
        "É rápido, basta transferir para a chave que passei que eu já libero ele aqui agora mesmo.",
        "Ele me deu o telefone da senhora como único contato de confiança para resolver essa emergência.",
        "Precisa ser agora antes de fecharmos o caixa da oficina.",
    ]

    for pi in parentes_inter:
        for pro in profissoes_inter:
            for si in situacoes_inter:
                for ui in urgencias_inter:
                    pool_intermediarios.add(f"Dona Maria, {pro} {pi}. {si} {ui}")
                    pool_intermediarios.add(f"Oi tia, {pro.lower()} {pi}, {si} {ui}")
                    if len(pool_intermediarios) >= 3500:
                        break
                if len(pool_intermediarios) >= 3500:
                    break
            if len(pool_intermediarios) >= 3500:
                break
        if len(pool_intermediarios) >= 3500:
            break

    # Golpe #1 no Brasil: "Oi mãe/pai/vó, troquei de número" (WhatsApp clonado / falso parente)
    pool_falso_parente = set()
    chamados_fp = [
        "Oi mãe", "Oi pai", "Oi vó", "Oi vovô", "Oi tia", "Oi tio",
        "Mãe", "Pai", "Vó", "Benção mãe", "Benção pai",
        "Oi mãezinha", "Oi paizinho", "Oi madrinha",
    ]
    desculpas_fp = [
        "troquei de número, salva esse aqui que o meu outro celular quebrou",
        "salva meu número novo aí, o celular antigo caiu na água e parou",
        "tô usando esse número novo porque perdi o chip antigo",
        "mudei de WhatsApp, pode apagar o número antigo e salvar esse",
        "estou falando do celular de um amigo porque o meu descarregou e bloqueou",
        "meu aplicativo do banco deu erro e o limite diário estourou hoje",
        "troquei de telefone agora cedo, anota meu número novo por favor",
        "fui assaltado e peguei um chip provisório, salva esse contato",
        "o WhatsApp no número antigo foi bloqueado, estou falando só por esse agora",
        "meu celular está na assistência técnica e estou usando esse número temporário",
    ]
    pedidos_fp = [
        "consegue fazer um Pix de R$ 850 pra pagar um boleto urgente pra mim? Te devolvo mais tarde!",
        "preciso pagar a oficina agora e meu app travou, faz esse Pix de R$ 650 nessa chave por favor?",
        "você consegue transferir R$ 1.200 pra esse fornecedor agora? Assim que o banco normalizar eu te devolvo.",
        "me ajuda com um Pix urgente de R$ 480 para essa conta aqui que depois eu te passo de volta.",
        "paga essa conta pra mim via Pix nessa chave que mais tarde eu te devolvo certinho.",
        "tô numa correria aqui e o banco bloqueou meu limite, faz um Pix de R$ 550 nessa chave pra mim?",
        "consegue me socorrer com um Pix de R$ 950 agora? Não consigo atender ligação porque tô numa reunião.",
        "faz uma transferência de R$ 1.500 pro meu amigo que está me ajudando aqui, amanhã cedo te pago.",
        "manda R$ 390 nessa chave Pix que vou te enviar porque meu app só libera amanhã.",
        "paga esse boleto de R$ 720 pra mim agora que o meu celular novo ainda não ativou o banco.",
    ]
    for ch in chamados_fp:
        for ds in desculpas_fp:
            pool_falso_parente.add(f"{ch}, {ds}.")
            for pd in pedidos_fp:
                pool_falso_parente.add(f"{ch}, {ds}. {pd.capitalize()}")
                pool_falso_parente.add(f"{ch}, {ds}, {pd}")

    data.extend(sample_pool(pool_intermediarios, 1800, "FALSO_INTERMEDIARIO"))
    data.extend(sample_pool(pool_falso_parente, 2200, "FALSO_INTERMEDIARIO"))

    # =========================================================================
    # Validação final de volume exato (50.000 frases) e exportação
    # =========================================================================
    if len(data) != 50000:
        raise AssertionError(f"Esperado 50.000 frases, mas foram geradas {len(data)}.")

    random.shuffle(data)
    print(f"Total de frases prontas no dataset: {len(data)}")

    with open(DATASET_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["texto", "label"])
        writer.writerows(data)

    print(f"Arquivo '{DATASET_PATH}' gerado com sucesso!")


if __name__ == "__main__":
    generate_full_dataset()
