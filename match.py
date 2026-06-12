import clip, torch
from PIL import Image
import time
import sys
import json

device = "cpu"
model, preprocess = clip.load("ViT-B/16", device=device)

def main():
  class_descriptions = []
  try:
    raw_input = sys.stdin.read()
    data = json.loads(raw_input)
    class_descriptions = data.get('descriptions')
  except Exception as e:
    error_response = {"status": "error", "message": str(e)}
    print(json.dumps(error_response))
  
  arguments = sys.argv[1:]
  image_path = arguments[0]

  image_tensor = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
  with torch.no_grad():
    text_inputs = torch.cat([clip.tokenize(t) for t in class_descriptions]).to(device)

    text_features = model.encode_text(text_inputs)
    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    
    image_features = model.encode_image(image_tensor)
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    values, indices = similarities[0].topk(len(class_descriptions))

    result = []
    for idx, val in zip(indices, values):
      result.append(f" - {class_descriptions[idx]} (similarity: {val:.5f})")
    result_text = "\n".join(result)
    report = f"""Matched result:
{result_text}"""
    print(report)
    return 

if __name__ == "__main__":
    main()
