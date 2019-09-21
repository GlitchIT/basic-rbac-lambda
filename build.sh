set -e

echo "Building zip"
rm -f build/lambda_build.zip
zip -qr build/lambda_build.zip -X '*build/*' .

echo "zipped complete"