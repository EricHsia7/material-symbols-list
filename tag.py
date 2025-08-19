import clip, torch
from PIL import Image
import json
import time
import re
import os

def get_class_descriptions():
  result = set()
  with open("./tmp/versions.json", "r", encoding="utf-8") as file:
    data = json.load(file)
    for symbol_name in data:
      words = symbol_name.split("_")
      for word in words:
        if len(word) > 3:
          result.add(word)
  return list(result)

device = "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)
class_descriptions = get_class_descriptions()
text_inputs_1 = torch.cat([clip.tokenize(desc) for desc in class_descriptions]).to(device)

def tag_image(file_path):
  start = time.time()
  image = preprocess(Image.open(file_path)).unsqueeze(0).to(device)
  with torch.no_grad():
    image_features = model.encode_image(image)
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    text_features_1 = model.encode_text(text_inputs_1)
    text_features_1 = text_features_1 / text_features_1.norm(dim=-1, keepdim=True)

    similarities = (100.0 * image_features @ text_features_1.T).softmax(dim=-1)
    values, indices = similarities[0].topk(32)
    result_1 = []
    for idx, val in zip(indices, values):
      result_1.append(class_descriptions[idx])
    
    text_inputs_2 = torch.cat([clip.tokenize(desc) for desc in result_1]).to(device)
    text_features_2 = model.encode_text(text_inputs_2)

    similarities_2 = (100.0 * image_features @ text_features_2.T).softmax(dim=-1)
    values_2, indices_2 = similarities_2[0].topk(8)
    result_2 = []
    for idx, val in zip(indices_2, values_2):
      result_2.append(result_1[idx])
    end = time.time()
    print(f"Successfully tagged {file_path} in {end - start:.2f}s")
    return result_2

def main(input_dir="./tmp/rasterized", output_dir="./tags"):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Iterate through all PNG files
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)

            # Process image
            result_list = tag_image(file_path)

            # Construct output filename
            base_name = os.path.splitext(filename)[0]
            output_file = os.path.join(output_dir, f"{base_name}.txt")

            # Save results to file
            with open(output_file, "w", encoding="utf-8") as f:
                for item in result_list:
                    f.write(str(item) + "\n")

main()