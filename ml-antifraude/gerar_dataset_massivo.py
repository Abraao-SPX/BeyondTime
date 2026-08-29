import random
import csv

def generate_dataset():
    data = []
    
    # --- 1. NORMAL (Vamos gerar um volume alto para ancorar as palavras normais) ---
    sujeitos_n = ["eu", "meu filho", "minha neta", "meu marido", "minha esposa", "meu vizinho"]
    acoes_n = ["fui ao banco", "paguei a conta", "fiz o pix", "resolvi o limite", "comprei pão", "fui caminhar"]
    tempos_n = ["hoje", "ontem", "de manhã", "no final de semana", "agora pouco", "na sexta"]
    for s in sujeitos_n:
        for a in acoes_n:
            for t in tempos_n:
                data.append((f"{s} {a} {t}.", "NORMAL"))
                data.append((f"{t} {s} {a}.", "NORMAL"))
                
    hobbies = ["Gosto muito de", "Sempre vou", "Adoro", "Meu passatempo é"]
    ativ = ["ouvir MPB", "fazer tricô", "assistir TV", "ir à igreja", "visitar a família", "cuidar das plantas"]
    for h in hobbies:
        for a in ativ:
            data.append((f"{h} {a}.", "NORMAL"))
            data.append((f"{h} {a} no final de semana.", "NORMAL"))

    # --- 2. PEDIDO_DINHEIRO ---
    pedidos = ["faz", "consegue fazer", "manda", "pode mandar", "transfere", "consegue me emprestar"]
    valores = ["um pix", "um dinheiro", "100 reais", "200", "um valor", "essa quantia"]
    urgencias = ["pra mim", "urgente", "pra essa chave", "agora", "hoje ainda"]
    promessas = ["", ", te pago amanhã", ", segunda eu devolvo", ", te dou o dobro depois", ", prometo devolver"]
    for p in pedidos:
        for v in valores:
            for u in urgencias:
                for pr in promessas:
                    data.append((f"{p} {v} {u}{pr}?", "PEDIDO_DINHEIRO"))

    # --- 3. EMERGENCIA_FINANCEIRA ---
    vitimas = ["estou", "meu filho está", "minha mãe está", "meu neto está"]
    problemas = ["no hospital", "internado", "no pronto socorro", "preso na estrada", "sofrendo um infarto"]
    acoes_e = ["preciso pagar a cirurgia", "tem que comprar o remédio", "preciso pagar a ambulância", "fui assaltado e perdi tudo"]
    for v in vitimas:
        for p in problemas:
            for a in acoes_e:
                data.append((f"{v} {p} e {a}.", "EMERGENCIA_FINANCEIRA"))
                data.append((f"Emergência! {v} {p}, {a}!", "EMERGENCIA_FINANCEIRA"))

    # --- 4. INTIMIDADE_ACELERADA ---
    declaracoes = ["amo você", "encontrei minha alma gêmea", "você é o amor da minha vida", "quero casar com você"]
    intensidades = ["mais que tudo", "loucamente", "como nunca amei ninguém", "desde o primeiro dia"]
    for d in declaracoes:
        for i in intensidades:
            data.append((f"{d} {i}.", "INTIMIDADE_ACELERADA"))
            data.append((f"Deus sabe que {d} {i}.", "INTIMIDADE_ACELERADA"))

    # --- 5. MIGRACAO_PLATAFORMA ---
    convites = ["vamos conversar", "me chama", "passa seu contato", "anota meu número", "vou deletar esse app, me adiciona"]
    plataformas = ["no whatsapp", "no telegram", "no zap", "lá no telefone", "no hangouts"]
    motivos = ["porque aqui trava", "lá é mais fácil", "para mandar áudio", "porque não entro muito aqui"]
    for c in convites:
        for p in plataformas:
            for m in motivos:
                data.append((f"{c} {p} {m}.", "MIGRACAO_PLATAFORMA"))

    # --- 6. EVASAO_ENCONTRO ---
    desculpas = ["estou viajando", "fui transferido", "estou trabalhando", "estou em missão"]
    locais = ["no exterior", "em uma plataforma de petróleo", "na Síria", "no Afeganistão", "no navio"]
    consequencias = ["por isso a câmera não funciona", "então não consigo fazer vídeo", "por isso não posso te ver agora"]
    for d in desculpas:
        for l in locais:
            for c in consequencias:
                data.append((f"{d} {l}, {c}.", "EVASAO_ENCONTRO"))

    # --- 7. ENCOMENDA_TAXA ---
    presentes = ["um presente", "uma caixa", "um iphone e joias", "dólares na mala"]
    situacoes = ["ficou preso na alfândega", "a receita federal segurou", "o diplomata foi parado"]
    solucoes = ["tem que pagar a taxa de liberação", "precisa depositar a multa", "pague a transportadora"]
    for p in presentes:
        for s in situacoes:
            for sol in solucoes:
                data.append((f"Mandei {p} mas {s}, {sol}.", "ENCOMENDA_TAXA"))

    # --- 8. INVESTIMENTO_SUSPEITO ---
    chamadas = ["eu posso te ensinar a", "tenho uma oportunidade para", "te ajudo a", "descobri um esquema para"]
    investimentos = ["investir em criptomoedas", "comprar bitcoin", "operar na corretora", "ganhar muito dinheiro"]
    garantias = ["com lucro garantido", "rendendo 10% ao dia", "sem risco nenhum", "com retorno rápido"]
    for c in chamadas:
        for i in investimentos:
            for g in garantias:
                data.append((f"{c} {i} {g}.", "INVESTIMENTO_SUSPEITO"))

    # --- 9. PEDIDO_CREDENCIAL ---
    pedidos_c = ["me passa", "qual é", "digita aqui", "me manda foto de", "preciso validar"]
    dados = ["sua senha do banco", "seu código do sms", "o token do whatsapp", "os números do seu cartão", "o cvv de segurança"]
    for p in pedidos_c:
        for d in dados:
            data.append((f"{p} {d}?", "PEDIDO_CREDENCIAL"))
            data.append((f"Por favor, {p} {d}.", "PEDIDO_CREDENCIAL"))

    # --- 10. SONDAGEM_FINANCEIRA ---
    perguntas = ["você tem", "qual é o seu", "você recebe", "sobrou", "consegue"]
    bens = ["limite no cartão", "aposentadoria gorda", "dinheiro na poupança", "casa própria", "seguro de vida"]
    para = ["para a gente viver junto", "hoje?", "no final do mês?", "no banco?"]
    for p in perguntas:
        for b in bens:
            for pr in para:
                data.append((f"{p} {b} {pr}?", "SONDAGEM_FINANCEIRA"))

    # Remove duplicates
    unique_data = list(set(data))
    
    # --- 11. INJEÇÃO DE OFUSCAÇÃO (Treinando a IA para o pior cenário) ---
    ofuscated_data = []
    for frase, label in unique_data:
        # Pega ~30% das frases e injeta ofuscações pesadas para a IA aprender o padrão
        if random.random() < 0.3:
            frase_ofuscada = frase
            # Injeta Leet Speak
            frase_ofuscada = frase_ofuscada.replace('a', '4').replace('e', '3').replace('i', '1').replace('o', '0').replace('s', '5')
            # Injeta pontuações (p.i.x)
            frase_ofuscada = frase_ofuscada.replace('pix', 'p.i.x').replace('whatsapp', 'w-h-a-t-s').replace('dinheiro', 'd1nh3ir0')
            ofuscated_data.append((frase_ofuscada, label))
            
    final_data = unique_data + ofuscated_data
    random.shuffle(final_data)
    
    # Save to CSV
    with open('dataset.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['texto', 'label'])
        writer.writerows(final_data)

    print(f"Dataset massivo gerado com {len(final_data)} frases (incluindo ofuscadas)!")

if __name__ == "__main__":
    generate_dataset()

