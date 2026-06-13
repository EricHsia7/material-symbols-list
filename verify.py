import clip, torch
from PIL import Image
import time
import sys
import json

@torch.no_grad()

def pick_device(prefer: str | None = None) -> torch.device:
  if prefer:
    return torch.device(prefer)
  if torch.cuda.is_available():
    return torch.device("cuda")
  if torch.backends.mps.is_available():
    return torch.device("mps")
  return torch.device("cpu")

device = pick_device()
model, preprocess = clip.load("ViT-B/16", device=device)

def main():
  descriptions = []
  try:
    raw_input = sys.stdin.read()
    data = json.loads(raw_input)
    descriptions = data.get('descriptions')
  except Exception as e:
    error_response = {"status": "error", "message": str(e)}
    print(json.dumps(error_response))
  
  arguments = sys.argv[1:]
  
  image_path = arguments[0]
  image_tensor = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
  image_features = model.encode_image(image_tensor)
  image_features = image_features / image_features.norm(dim=-1, keepdim=True)

  result = []
  for description in descriptions:
    class_descriptions = []
    sentence = []
    for phrase in description:
      sentence.append(phrase)
      class_descriptions.append(" ".join(sentence))
    n = len(class_descriptions)
    
    text_inputs = torch.cat([clip.tokenize(t) for t in class_descriptions]).to(device)

    text_features = model.encode_text(text_inputs)
    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
  
    similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    values, indices = similarities[0].topk(n, sorted=False)

    markedDescription = []
    for idx, val in zip(indices, values):
      if val < 1.2 * (0.5 - abs(idx / n - 0.5)):
        markedDescription.append(f"[DELETE][{description[idx]}]")
      else:
        markedDescription.append(f"{description[idx]}")
    result.append(f"- {' '.join(markedDescription)}")
   
  result_text = "\n".join(result) #json.dumps(, ensure_ascii=False, indent=2)
  report = f"""Suggestions:
{result_text}"""
  print(report)

if __name__ == "__main__":
    main()
