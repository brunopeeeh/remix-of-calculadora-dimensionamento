import os
import sys
from openai import OpenAI

# Load environment variables from .env if present
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")

# Verify API key is present
api_key = os.getenv("DASHSCOPE_API_KEY")
if not api_key:
    print("Erro: A variável DASHSCOPE_API_KEY não foi encontrada no seu arquivo .env.")
    sys.exit(1)

# Initialize OpenAI client compatible with DashScope
client = OpenAI(
    api_key=api_key,
    base_url="https://dashscope-us.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1",
)

def main():
    print("=" * 60)
    print("        Bem-vindo ao Chatbot de Teste (Qwen 3.7 Max)")
    print("=" * 60)
    print("Comandos disponíveis:")
    print("  /exit ou /sair : Finaliza o chat")
    print("  /clear ou /limpar : Limpa o histórico de contexto")
    print("-" * 60)

    previous_response_id = None

    while True:
        try:
            # Get user input
            user_input = input("\nVocê > ").strip()
            if not user_input:
                continue

            # Check for special commands
            if user_input.lower() in ["/exit", "/sair"]:
                print("\nEncerrando chat. Até logo!")
                break

            if user_input.lower() in ["/clear", "/limpar"]:
                previous_response_id = None
                print("\n[Histórico e contexto limpos!]")
                continue

            print("\nBuscando resposta...")

            # Prepare parameters for custom responses API
            extra_body = {
                "enable_thinking": True
            }
            if previous_response_id:
                extra_body["previous_response_id"] = previous_response_id

            # Call DashScope custom responses endpoint
            response = client.responses.create(
                model="qwen3.7-max",
                input=user_input,
                extra_body=extra_body
            )

            # Print thinking process if available
            has_thinking = False
            for item in response.output:
                if item.type == "reasoning":
                    if not has_thinking:
                        print("\n[Pensamento do Modelo]")
                        print("-" * 30)
                        has_thinking = True
                    for summary in item.summary:
                        print(summary.text, end="", flush=True)
            if has_thinking:
                print("\n" + "-" * 30)

            # Print final answer
            for item in response.output:
                if item.type == "message":
                    print(f"\nQwen > {item.content[0].text}")

            # Save response ID to continue conversation context in the next turn
            previous_response_id = response.id

        except KeyboardInterrupt:
            print("\n\nEncerrando chat por interrupção. Até logo!")
            break
        except Exception as e:
            print(f"\nErro ocorrido: {e}")

if __name__ == "__main__":
    main()
