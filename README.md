# Queen Chrysalis
Queen Chrysalis is a NodeJS extension/service to the [Princess Luna](https://github.com/Thorinair/Princess-Luna) Discord bot. The main purpose of this service is to provide an API for ANN (Artificial Neural Network) operations, which Princess Luna is then able to use for various functionalities. The service is supposed to run on a separate machine with a CUDA enabled NVidia GPU installed.

## Features
* Provides a RESTful API for Princess Luna.
* Currently supported features:
    - [Waifu2x](https://github.com/nagadomi/waifu2x) image scaling and noise reduction.


## Privacy & Data Collection
**For Waifu2x functionality:** The service downloads the requested image locally on the hard drive in order to process it. Once the processing is complete, the image is deleted and only the output image is kept. The output image is hosted on a publically available URL so people can download their new images.